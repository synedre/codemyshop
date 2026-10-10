

import { createHmac, createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { useClientDb } from '~/server/utils/db'
import { usePocPg } from '~/server/db/drizzle-pg'
import { promoteOrderValid } from '~/server/utils/order-valid'
import { issueOrderInvoice } from '~/server/utils/order-invoice'
import { getOrderFromDb } from '~/server/utils/orders-db'
import { fetchCarrierNameForOrder } from '~/server/utils/carrier-name'
import { sendOrderConfirmationEmail, notifyAdminNewOrder } from '~/server/utils/order-emails'
import { creditLoyaltyForOrder } from '~/server/utils/loyalty'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionOrderPaidPayload } from '~/server/utils/hooks-catalog'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, string>>(event)

  const env = process.env
  const db = useClientDb(event)

  const dbMode = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'SYSTEMPAY_MODE' LIMIT 1`,
  ).catch(() => null)
  const mode = (dbMode?.value || env.SYSTEMPAY_MODE || 'TEST').toUpperCase()
  const key = mode === 'TEST' ? (env.SYSTEMPAY_TEST_KEY || '') : (env.SYSTEMPAY_PROD_KEY || '')

  
  
  
  const orderRefForLog = body.vads_order_id || null
  const idOrderForLog = body.vads_ext_info_order_id ? Number(body.vads_ext_info_order_id) : null
  const transUuidForLog = body.vads_trans_uuid || null
  const transStatusForLog = body.vads_trans_status || null
  const amountCentsForLog = body.vads_amount ? Number(body.vads_amount) : null

  const logRow = await db.get<{ id_log: number }>(
    `INSERT INTO cs_systempay_log
       (order_reference, id_order, vads_trans_status, vads_trans_uuid, amount_cents, mode, verified, raw_body)
     VALUES (?, ?, ?, ?, ?, ?, false, ?::jsonb)
     RETURNING id_log`,
    [orderRefForLog, idOrderForLog, transStatusForLog, transUuidForLog, amountCentsForLog, mode, JSON.stringify(body)],
  ).catch((err: any) => {
    console.error('[systempay-ipn] cs_systempay_log INSERT failed:', err?.message || err)
    return null
  })
  const idLog = logRow?.id_log ?? null

  const flagLogError = async (errMsg: string) => {
    if (!idLog) return
    await db.run(`UPDATE cs_systempay_log SET error_message = ? WHERE id_log = ?`, [errMsg, idLog]).catch(() => {})
  }

  
  const receivedSig = body.signature
  if (!receivedSig) {
    console.error('[systempay-ipn] Pas de signature dans la notification')
    await flagLogError('Missing signature')
    throw createError({ statusCode: 401, message: 'Missing signature' })
  }

  
  const signAlgo = (env.SYSTEMPAY_SIGN_ALGO || 'sha256_hmac').toLowerCase()
  const sortedKeys = Object.keys(body).filter(k => k.startsWith('vads_')).sort()
  const payload = sortedKeys.map(k => body[k]).join('+')
  const expectedSig = signAlgo === 'sha1'
    ? createHash('sha1').update(payload + '+' + key).digest('hex')
    : createHmac('sha256', key).update(payload).digest('base64')

  if (receivedSig !== expectedSig) {
    console.error(`[systempay-ipn] Signature invalide pour order=${body.vads_order_id} (mode=${mode})`)
    await flagLogError('Invalid signature')
    throw createError({ statusCode: 401, message: 'Invalid signature' })
  }

  
  if (idLog) {
    await db.run(`UPDATE cs_systempay_log SET verified = true WHERE id_log = ?`, [idLog]).catch(() => {})
  }

  
  if (body.vads_ctx_mode && body.vads_ctx_mode !== mode) {
    console.error(`[systempay-ipn] Mode mismatch : notif=${body.vads_ctx_mode} instance=${mode}`)
    await flagLogError(`Mode mismatch (notif=${body.vads_ctx_mode} instance=${mode})`)
    throw createError({ statusCode: 400, message: 'Mode mismatch' })
  }

  const orderRef = body.vads_order_id
  const orderId = Number(body.vads_ext_info_order_id)
  const transStatus = body.vads_trans_status
  const amountCents = Number(body.vads_amount || 0)

  console.log(`[systempay-ipn] order=${orderRef} id=${orderId} status=${transStatus} amount=${amountCents}c mode=${mode}`)

  
  const statusMap: Record<string, number> = {
    AUTHORISED: 2,
    CAPTURED: 2,
    REFUSED: 8,
    CANCELLED: 6,
    ABANDONED: 6,
    EXPIRED: 8,
  }
  const newState = statusMap[transStatus]

  if (!newState || !orderId) {
    
    return { status: 'ignored', reason: 'Status non mappé ou order_id manquant' }
  }

  
  const order = await db.get<{ id_order: number; total_paid: string; current_state: number }>(
    `SELECT id_order, total_paid, current_state FROM ps_orders WHERE id_order = ? LIMIT 1`,
    [orderId],
  )
  if (!order) {
    console.error(`[systempay-ipn] Commande #${orderId} (${orderRef}) introuvable`)
    throw createError({ statusCode: 404, message: 'Order not found' })
  }

  
  
  if (newState === 2) {
    const expectedCents = Math.round(Number(order.total_paid || 0) * 100)
    if (Math.abs(expectedCents - amountCents) > 1) {
      console.error(`[systempay-ipn] Montant mismatch : reçu=${amountCents}c attendu=${expectedCents}c order=#${orderId}`)
      throw createError({ statusCode: 400, message: 'Amount mismatch' })
    }
  }

  
  if (Number(order.current_state) === newState) {
    console.log(`[systempay-ipn] Order #${orderId} déjà au state ${newState} — skip`)
    return { status: 'ok', reason: 'already at target state' }
  }

  
  try {
    const { affectedRows } = await db.run(
      `UPDATE ps_orders SET current_state = ?, date_upd = NOW() WHERE id_order = ?`,
      [newState, orderId],
    )
    if (affectedRows) {
      await db.run(
        `INSERT INTO ps_order_history (id_employee, id_order, id_order_state, date_add)
         VALUES (0, ?, ?, NOW())`,
        [orderId, newState],
      )
      console.log(`[systempay-ipn] Order #${orderId} (${orderRef}) → state ${newState} (${transStatus})`)

      
      
      await promoteOrderValid(usePocPg(), orderId, newState)
      await issueOrderInvoice(usePocPg(), orderId, newState).catch((err: any) => {
        console.error(`[systempay-ipn] issueOrderInvoice échoué order=#${orderId}:`, err?.message || err)
      })
    }

    
    
    
    if (newState === 2) {
      const transactionId = body.vads_trans_uuid || body.vads_trans_id || ''
      const cardBrand = body.vads_card_brand || ''
      const cardNumber = body.vads_card_number || ''
      const cardHolder = `${body.vads_cust_first_name || ''} ${body.vads_cust_last_name || ''}`.trim()
      const cardExpiry = body.vads_expiry_month && body.vads_expiry_year
        ? `${body.vads_expiry_month}/${body.vads_expiry_year}` : ''
      const amountEur = amountCents / 100

      
      const existing = await db.get<{ id_order_payment: number }>(
        `SELECT id_order_payment FROM ps_order_payment
          WHERE order_reference = ? AND transaction_id = ? LIMIT 1`,
        [orderRef, transactionId],
      ).catch(() => null)

      if (!existing) {
        await db.run(
          `INSERT INTO ps_order_payment
            (order_reference, id_currency, amount, payment_method, conversion_rate,
             transaction_id, card_number, card_brand, card_expiration, card_holder,
             date_add, id_employee)
           VALUES (?, 1, ?, ?, 1, ?, ?, ?, ?, ?, NOW(), 0)`,
          [orderRef, amountEur, 'Paiement CB SystemPay', transactionId, cardNumber, cardBrand, cardExpiry, cardHolder],
        ).catch((err: any) => {
          console.error(`[systempay-ipn] ps_order_payment INSERT failed order=${orderRef}:`, err?.message || err)
        })
        console.log(`[systempay-ipn] ps_order_payment inserted order=${orderRef} txn=${transactionId} brand=${cardBrand}`)
      } else {
        console.log(`[systempay-ipn] ps_order_payment déjà présent order=${orderRef} txn=${transactionId} — skip`)
      }
    }
  } catch (err: any) {
    console.error(`[systempay-ipn] Erreur MAJ commande ${orderRef}:`, err?.message)
    await flagLogError(`DB error: ${err?.message}`)
    throw createError({ statusCode: 500, message: 'DB error' })
  }

  
  
  
  
  if (newState === 2) {
    callAction<ActionOrderPaidPayload>(HOOKS_ACTION.ORDER_PAID, {
      orderId,
      orderReference: orderRef,
      totalCents: amountCents,
      gateway: 'systempay',
    }).catch((err: any) => {
      console.error(`[systempay-ipn] hook '${HOOKS_ACTION.ORDER_PAID}' failed:`, err?.message)
    })
  }

  
  
  if (newState === 2) {
    creditLoyaltyForOrder(orderId).catch((err: any) => {
      console.error(`[systempay-ipn] Loyalty credit failed for order ${orderId}:`, err?.message || err)
    })

    
    
    try {
      const d = usePocPg()
      const cartRow: any[] = await d.execute(sql`
        SELECT id_cart FROM cs_main.ps_orders WHERE id_order = ${orderId} LIMIT 1
      `) as any[]
      const idCart = Number(cartRow?.[0]?.id_cart || 0)
      if (idCart > 0) {
        const projectRows: any[] = await d.execute(sql`
          UPDATE cs_main.cs_smartproject
             SET project_status = 'gagne', date_upd = NOW()
           WHERE cart_id_cart = ${idCart}
             AND project_status NOT IN ('gagne', 'perdu_standby')
           RETURNING id_ac_smartproject
        `) as any[]
        if (projectRows?.length) {
          console.log(`[systempay-ipn] smartproject #${projectRows[0].id_ac_smartproject} → gagne (order=${orderId})`)
        }
      }
    } catch (err: any) {
      console.error(`[systempay-ipn] smartproject status sync failed for order ${orderId}:`, err?.message || err)
    }
  }

  
  
  
  
  
  
  
  
  if (newState === 2) {
    try {
      const fullOrder = await getOrderFromDb(orderId, { event })
      const custEmail = body.vads_cust_email || ''
      if (fullOrder) {
        const d = usePocPg()
        const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name='PS_SHOP_NAME' LIMIT 1`).catch(() => [] as any[]) as any[]
        const shopName = shopRows?.[0]?.value || 'Boutique'

        
        
        
        
        
        const carrierName = await fetchCarrierNameForOrder(d, orderId)

        
        if (custEmail) {
          const cfg = useRuntimeConfig()
          const baseUrl = String(cfg.public.psFrontUrl || '').replace(/\/$/, '')
          const historyUrl = `${baseUrl}/mon-compte/commandes/${orderId}`

          sendOrderConfirmationEmail(
            fullOrder as any,
            custEmail,
            shopName,
            '#4F46E5',
            undefined,
            { carrierName, historyUrl },
          ).catch(err => console.error('[systempay-ipn] Email confirmation failed:', err?.message || err))
        }

        
        
        notifyAdminNewOrder({
          order:         fullOrder as any,
          customerEmail: custEmail,
          shopName,
          carrierName,
        }).catch(err => console.error('[systempay-ipn] Admin notif failed:', err?.message || err))
      }
    } catch (err: any) {
      
      
      console.error('[systempay-ipn] Erreur préparation emails (confirmation + notif admin):', err?.message)
    }
  }

  return { status: 'ok', orderId, newState, transStatus }
})
