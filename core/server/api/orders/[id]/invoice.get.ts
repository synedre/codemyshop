

import { resolveClientId } from '~/server/utils/db'
import { getOrderFromDb } from '~/server/utils/orders-db'
import { requireCustomer } from '~/server/utils/customer-session'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'
import { loadInvoiceContext } from '~/server/utils/invoice-context'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { clientId } = getQuery(event) as { clientId?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const session = requireCustomer(event)

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const order = await getOrderFromDb(id, ctx)
  if (!order || order.customerId !== session.customerId) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  if (!order.invoiceNumber) throw createError({ statusCode: 404, message: 'Aucune facture disponible pour cette commande' })

  const { shopName, seller, labels } = await loadInvoiceContext()

  const resolvedClientId = clientId ? String(clientId) : resolveClientId(event)
  const { getThemePrimaryColor } = await import('~/modules/theme/server/utils/theme')
  const accentColor = (await getThemePrimaryColor({ clientId: resolvedClientId }).catch(() => null)) || '#4F46E5'
  const pdf = await generateInvoicePdf(order, shopName, accentColor, seller, labels)

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="facture-${order.invoiceNumber}-${order.reference}.pdf"`,
    'Content-Length': String(pdf.length),
  })
  return pdf
})
