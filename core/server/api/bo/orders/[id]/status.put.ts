

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { promoteOrderValid } from '~/server/utils/order-valid'
import { issueOrderInvoice } from '~/server/utils/order-invoice'
import { sendOrderShippedEmail, sendOrderInPreparationEmail } from '~/server/utils/order-emails'
import { creditLoyaltyForOrder } from '~/server/utils/loyalty'
import { requireEmployeeSession } from '~/server/utils/session'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionOrderStatusChangedPayload } from '~/server/utils/hooks-catalog'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const { statusId, employeeId } = await readBody<{ statusId: number; employeeId?: number }>(event)
  if (!statusId) throw createError({ statusCode: 400, message: 'statusId requis' })

  const d = usePocPg()
  const orderId = Number(id)

  const orderRows: any[] = await d.execute(sql`SELECT id_order, current_state FROM cs_main.ps_orders WHERE id_order = ${orderId}`) as any[]
  const order = orderRows?.[0]
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })

  if (order.current_state === statusId) return { success: true, message: 'Statut déjà à jour' }

  await d.execute(sql`
    INSERT INTO cs_main.ps_order_history (id_order, id_order_state, id_employee, date_add)
    VALUES (${orderId}, ${statusId}, ${employeeId || 0}, NOW())
  `)

  await d.execute(sql`UPDATE cs_main.ps_orders SET current_state = ${statusId}, date_upd = NOW() WHERE id_order = ${orderId}`)

  
  
  
  await promoteOrderValid(d, orderId, statusId)
  
  
  await issueOrderInvoice(d, orderId, statusId).catch((err: any) => {
    console.error(`[orders/${orderId}/status] issueOrderInvoice échoué:`, err?.message || err)
  })

  
  
  
  notifyIfInPreparation(d, orderId, statusId).catch((err: any) => {
    console.error(`[orders/${orderId}/status] notify in-preparation échoué:`, err?.message || err)
  })

  
  
  
  notifyIfShipped(d, orderId, statusId).catch((err: any) => {
    console.error(`[orders/${orderId}/status] notify shipped échoué:`, err?.message || err)
  })

  
  
  creditLoyaltyForOrder(orderId).catch((err: any) => {
    console.error(`[orders/${orderId}/status] credit loyalty échoué:`, err?.message || err)
  })

  callAction<ActionOrderStatusChangedPayload>(HOOKS_ACTION.ORDER_STATUS_CHANGED, {
    orderId,
    oldStatus: Number(order.current_state),
    newStatus: statusId,
  }).catch((err: any) => {
    console.error(`[orders/${orderId}/status] hook '${HOOKS_ACTION.ORDER_STATUS_CHANGED}' failed:`, err?.message)
  })

  return { success: true }
})

async function notifyIfInPreparation(d: ReturnType<typeof usePocPg>, orderId: number, statusId: number): Promise<void> {
  
  
  
  const S = sql.raw('vaisseau_mere' + '_ac')

  const stateRows: any[] = await d.execute(sql`
    SELECT template FROM ${S}.ps_order_state WHERE id_order_state = ${statusId} LIMIT 1
  `) as any[]
  if (!stateRows[0] || String(stateRows[0].template || '').toLowerCase() !== 'preparation') return

  const ctxRows: any[] = await d.execute(sql`
    SELECT o.reference, c.email, c.firstname,
           cfg.value AS shop_name
      FROM ${S}.ps_orders o
      JOIN ${S}.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN ${S}.ps_configuration cfg ON cfg.name = 'PS_SHOP_NAME'
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `) as any[]
  const ctx = ctxRows[0]
  if (!ctx?.email) return

  const shopName = String(ctx.shop_name || 'Boutique')
  
  const shopUrl = String(process.env.NUXT_PUBLIC_PS_FRONT_URL || '')

  await sendOrderInPreparationEmail(
    String(ctx.email),
    String(ctx.firstname || ''),
    String(ctx.reference),
    shopName,
    shopUrl,
  )
  console.log(`[orders/${orderId}/status] order_in_preparation email sent to ${ctx.email}`)
}

async function notifyIfShipped(d: ReturnType<typeof usePocPg>, orderId: number, statusId: number): Promise<void> {
  const stateRows: any[] = await d.execute(sql`
    SELECT shipped FROM cs_main.ps_order_state WHERE id_order_state = ${statusId} LIMIT 1
  `) as any[]
  if (!stateRows[0] || Number(stateRows[0].shipped) !== 1) return

  const ctxRows: any[] = await d.execute(sql`
    SELECT o.reference, c.email, c.firstname,
           oc.tracking_number, ca.name AS carrier_name, ca.url AS carrier_url,
           cfg.value AS shop_name
      FROM cs_main.ps_orders o
      JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN cs_main.ps_order_carrier oc ON oc.id_order = o.id_order
      LEFT JOIN cs_main.ps_carrier ca ON ca.id_carrier = oc.id_carrier
      LEFT JOIN cs_main.ps_configuration cfg ON cfg.name = 'PS_SHOP_NAME'
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `) as any[]
  const ctx = ctxRows[0]
  if (!ctx?.email) return

  const carrier = String(ctx.carrier_name || '')
  const trackingUrl = ctx.carrier_url && ctx.tracking_number
    ? String(ctx.carrier_url).replace('@', String(ctx.tracking_number))
    : ''
  const shopName = String(ctx.shop_name || 'Boutique')
  
  
  
  const baseUrl = String(useRuntimeConfig().public.psFrontUrl || '').replace(/\/$/, '')
  const historyUrl = baseUrl ? `${baseUrl}/mon-compte/commandes/${orderId}` : ''

  await sendOrderShippedEmail(
    String(ctx.email),
    String(ctx.firstname || ''),
    String(ctx.reference),
    carrier,
    trackingUrl,
    shopName,
    undefined,
    historyUrl,
  )
  console.log(`[orders/${orderId}/status] order_shipped email sent to ${ctx.email}`)
}
