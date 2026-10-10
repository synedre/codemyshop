

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'
import { getOrderFromDb } from '~/server/utils/orders-db'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'
import { loadInvoiceContext } from '~/server/utils/invoice-context'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const { id } = getQuery(event) as { id?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const db = useClientDb(event)

  const inv = await db.get<any>(
    `SELECT id_order_invoice, id_order, number, date_add FROM ps_order_invoice WHERE id_order_invoice = ?`,
    [Number(id)],
  )
  if (!inv) throw createError({ statusCode: 404, message: 'Facture introuvable' })

  const order = await getOrderFromDb(Number(inv.id_order), { event })
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  order.invoiceNumber = String(inv.number || inv.id_order_invoice)
  order.invoiceDate = inv.date_add ? String(inv.date_add) : order.invoiceDate

  const { shopName, seller, labels } = await loadInvoiceContext()
  const { getThemePrimaryColor } = await import('~/modules/theme/server/utils/theme')
  const accentColor = (await getThemePrimaryColor({ clientId: resolveClientId(event) }).catch(() => null)) || '#4F46E5'
  const pdf = await generateInvoicePdf(order, shopName, accentColor, seller, labels)

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="facture-${order.invoiceNumber}.pdf"`,
    'Content-Length': String(pdf.length),
  })
  return pdf
})
