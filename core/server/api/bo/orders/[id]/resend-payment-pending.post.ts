

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sendPaymentPendingEmail } from '~/server/utils/order-emails'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const orderId = Number(id)

  const d = usePocPg()

  const ctxRows: any[] = await d.execute(sql`
    SELECT o.id_order, o.reference, o.total_paid_tax_incl, o.total_paid,
           c.email, c.firstname,
           cfg.value AS shop_name
      FROM cs_main.ps_orders o
      JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN cs_main.ps_configuration cfg ON cfg.name = 'PS_SHOP_NAME'
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `) as any[]
  const ctx = ctxRows[0]
  if (!ctx) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  if (!ctx.email) throw createError({ statusCode: 422, message: 'Email client absent' })

  const ribRows: any[] = await d.execute(sql`
    SELECT name, value FROM cs_main.ps_configuration
     WHERE name IN ('BANK_WIRE_OWNER', 'BANK_WIRE_DETAILS', 'BANK_WIRE_ADDRESS')
  `) as any[]
  const rib: Record<string, string> = {}
  for (const r of ribRows) rib[String(r.name)] = String(r.value || '')

  
  
  const totalPaid = Number(ctx.total_paid_tax_incl || ctx.total_paid || 0)
  const baseUrl = String(useRuntimeConfig().public.psFrontUrl || '').replace(/\/$/, '')
  const historyUrl = `${baseUrl}/mon-compte/commandes/${Number(ctx.id_order)}`

  const result = await sendPaymentPendingEmail(
    String(ctx.email),
    String(ctx.firstname || ''),
    String(ctx.reference),
    {
      owner:   rib.BANK_WIRE_OWNER   || undefined,
      details: rib.BANK_WIRE_DETAILS || undefined,
      address: rib.BANK_WIRE_ADDRESS || undefined,
    },
    String(ctx.shop_name || 'Boutique'),
    '#4F46E5',
    totalPaid,
    historyUrl,
  )

  return { success: true, queued: result }
})
