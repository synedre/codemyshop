

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { createOrderFromCart, getOrderFromDb } from '~/server/utils/orders-db'
import { fetchCarrierName } from '~/server/utils/carrier-name'
import { sendOrderConfirmationEmail, notifyAdminNewOrder } from '~/server/utils/order-emails'
import { getThemePrimaryColor } from '~/modules/theme/server/utils/theme'
import { getCustomerSession, requireCustomer, resolveCustomerIdForRequest } from '~/server/utils/customer-session'
import { attachActionToSession } from '~/internal/impersonation/server/utils/impersonation'
import { creditLoyaltyForOrder } from '~/server/utils/loyalty'
import { assertCartAccess } from '~/server/utils/cart-proof'

export default defineEventHandler(async (event) => {
  
  
  
  requireCustomer(event)
  const body = await readBody<any>(event)
  const { cartId, customerId, addressDeliveryId, addressInvoiceId, carrierId, paymentMethod, clientId, customerEmail, deliveryComment, attribution } = body || {}
  const resolvedCustomerId = resolveCustomerIdForRequest(event, customerId)

  if (!cartId || !resolvedCustomerId || !addressDeliveryId || !carrierId) {
    throw createError({ statusCode: 400, message: 'cartId, customerId, addressDeliveryId et carrierId requis' })
  }

  await assertCartAccess(event, cartId)

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const created = await createOrderFromCart({
    cartId: Number(cartId),
    customerId: resolvedCustomerId,
    addressDeliveryId: Number(addressDeliveryId),
    addressInvoiceId: Number(addressInvoiceId || addressDeliveryId),
    carrierId: Number(carrierId),
    paymentMethod: String(paymentMethod || 'Virement bancaire'),
  }, ctx)
  if (!created) throw createError({ statusCode: 500, message: 'Impossible de créer la commande' })

  const order = await getOrderFromDb(created.id, ctx)
  if (!order) throw createError({ statusCode: 500, message: 'Commande créée mais introuvable' })

  
  
  
  
  
  
  
  try {
    const dPg = usePocPg()
    const projectRows: any[] = await dPg.execute(sql`
      UPDATE cs_main.cs_smartproject
         SET project_status = 'en_cours',
             final_price    = COALESCE(final_price, ${Number((order as any).totalPaidTTC || 0)}),
             date_upd       = NOW()
       WHERE cart_id_cart = ${Number(cartId)}
         AND project_status IN ('lead_entrant', 'qualification', 'devis_envoye', 'devis_accepte')
       RETURNING id_ac_smartproject
    `) as any[]
    if (projectRows?.length) {
      console.log(`[orders/create] smartproject #${projectRows[0].id_ac_smartproject} → en_cours (order=#${(order as any).id}, cart=${cartId})`)
    }
  } catch (err: any) {
    console.error('[orders/create] smartproject status sync failed:', err?.message || err)
  }

  
  
  
  
  
  
  if (attribution && typeof attribution === 'object') {
    const cut = (v: any, n: number): string | null => {
      const s = (v == null ? '' : String(v)).trim()
      return s ? s.slice(0, n) : null
    }
    const gclid = cut(attribution.gclid, 255)
    const gbraid = cut(attribution.gbraid, 255)
    const wbraid = cut(attribution.wbraid, 255)
    if (gclid || gbraid || wbraid) {
      
      const rawClickAt = cut(attribution.click_at, 32)
      const clickAt = rawClickAt && !Number.isNaN(Date.parse(rawClickAt)) ? rawClickAt : null
      try {
        const dPg = usePocPg()
        await dPg.execute(sql`
          INSERT INTO cs_main.cs_order_attribution
            (id_order, gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, landing_url, click_at)
          VALUES (
            ${Number((order as any).id)}, ${gclid}, ${gbraid}, ${wbraid},
            ${cut(attribution.utm_source, 128)}, ${cut(attribution.utm_medium, 128)},
            ${cut(attribution.utm_campaign, 255)}, ${cut(attribution.landing_url, 1024)}, ${clickAt}
          )
          ON CONFLICT (id_order) DO NOTHING
        `)
      } catch (err: any) {
        console.error(`[orders/create] cs_order_attribution INSERT failed (order=${(order as any).id}):`, err?.message || err)
      }
    }
  }

  
  
  
  
  const deliveryCommentClean = String(deliveryComment || '').trim().slice(0, 2000)
  if (deliveryCommentClean) {
    try {
      const dPg = usePocPg()
      await dPg.execute(sql`
        INSERT INTO cs_main.ps_message
          (id_cart, id_customer, id_order, message, private, date_add)
        VALUES
          (${Number(cartId)}, ${resolvedCustomerId}, ${Number((order as any).id)},
           ${deliveryCommentClean}, 0, NOW())
      `)
    } catch (err: any) {
      console.error(`[orders/create] ps_message INSERT failed (order=${(order as any).id}):`, err?.message || err)
    }
  }

  const session = getCustomerSession(event)
  if (session?.isImpersonated && session.impersonationSessionId) {
    await attachActionToSession(session.impersonationSessionId, { idOrder: Number((order as any).id) }).catch(err => {
      console.error('[orders/create] impersonation audit failed:', err?.message || err)
    })
  }

  
  
  
  let effectiveCustomerEmail: string | undefined = customerEmail
  if (!effectiveCustomerEmail && resolvedCustomerId) {
    try {
      const dPg = usePocPg()
      const rows: any[] = await dPg.execute(sql`
        SELECT email FROM ps_customer
         WHERE id_customer = ${resolvedCustomerId} LIMIT 1
      `) as any[]
      effectiveCustomerEmail = rows?.[0]?.email || undefined
      if (effectiveCustomerEmail) {
        console.log(`[orders/create] customerEmail fallback DB → ${effectiveCustomerEmail} (id_customer=${resolvedCustomerId})`)
      }
    } catch {
      
    }
  }

  if (effectiveCustomerEmail) {
    const d = usePocPg()
    const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name='PS_SHOP_NAME' LIMIT 1`).catch(() => [] as any[]) as any[]
    const shopRow = shopRows?.[0]
    const shopName = shopRow?.value
      || (clientId ? `${String(clientId).charAt(0).toUpperCase()}${String(clientId).slice(1)}` : 'Boutique')

    
    
    
    
    const carrierName = await fetchCarrierName(d, carrierId)

    
    
    
    
    
    
    
    
    const paymentLow = String(order.payment).toLowerCase()
    const isSystempay = paymentLow.includes('systempay') || paymentLow.includes('carte bancaire')
      || paymentLow.includes('stripe') || paymentLow.includes('klarna') || paymentLow.includes('paypal')
    const isBankwire = paymentLow.includes('virement')

    if (!isSystempay) {
      
      let bankDetails: { owner: string; details: string; address: string; customText: string } | undefined
      if (isBankwire) {
        const bankRows: any[] = await d.execute(sql`
          SELECT name, value FROM cs_main.ps_configuration
           WHERE name IN ('BANK_WIRE_OWNER','BANK_WIRE_DETAILS','BANK_WIRE_ADDRESS','BANK_WIRE_CUSTOM_TEXT')
        `).catch(() => [] as any[]) as Array<{ name: string; value: string | null }>
        const m: Record<string, string> = {}
        for (const r of bankRows) m[r.name] = String(r.value || '')
        bankDetails = {
          owner: m.BANK_WIRE_OWNER || '',
          details: m.BANK_WIRE_DETAILS || '',
          address: m.BANK_WIRE_ADDRESS || '',
          customText: m.BANK_WIRE_CUSTOM_TEXT || '',
        }
      }

      const cfg = useRuntimeConfig()
      const baseUrl = String(cfg.public.psFrontUrl || '').replace(/\/$/, '')
      const historyUrl = `${baseUrl}/mon-compte/commandes/${(order as any).id}`

      
      
      
      
      
      const accentColor = (await getThemePrimaryColor({ event }).catch(() => null)) || '#4F46E5'

      sendOrderConfirmationEmail(
        order as any,
        String(effectiveCustomerEmail),
        shopName,
        accentColor,
        bankDetails,
        { carrierName, historyUrl },
      ).catch(err => {
        console.error('[orders/create] Email send failed:', err)
      })
    } else {
      console.log(`[orders/create] SystemPay → email confirmation différé jusqu'à IPN success (order=#${(order as any).reference})`)
    }

    
    
    
    
    
    
    if (!isSystempay) {
      
      notifyAdminNewOrder({
        order:           order as any,
        customerEmail:   String(effectiveCustomerEmail),
        shopName,
        carrierName,
        customerMessage: deliveryCommentClean,
        customerId:      resolvedCustomerId,
      }).catch(err => {
        console.error('[orders/create] Admin notif failed:', err?.message || err)
      })
    } else {
      console.log(`[orders/create] SystemPay → notif admin différée jusqu'à IPN success (order=#${(order as any).reference})`)
    }
  }

  
  
  
  creditLoyaltyForOrder(Number((order as any).id)).catch(err => {
    console.error('[orders/create] Loyalty credit failed:', err?.message || err)
  })

  return order
})
