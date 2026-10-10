

import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { resolveClientId } from '~/server/utils/db'
import { getOrdersForCustomer } from '~/server/utils/orders-db'
import { requireCustomer } from '~/server/utils/customer-session'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'
import { loadInvoiceContext } from '~/server/utils/invoice-context'

export default defineEventHandler(async (event) => {
  
  const { customerId } = requireCustomer(event)
  const { clientId, ids } = getQuery(event) as {
    clientId?: string
    ids?: string
  }

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const allOrders = await getOrdersForCustomer(customerId, 100, ctx)

  
  let orders = allOrders.filter(o => o.invoiceNumber)

  
  if (ids) {
    const idSet = new Set(ids.split(',').map(Number))
    orders = orders.filter(o => idSet.has(o.id))
  }

  if (!orders.length) throw createError({ statusCode: 404, message: 'Aucune facture disponible' })

  
  const { shopName, seller, labels } = await loadInvoiceContext()

  const resolvedClientId = clientId ? String(clientId) : resolveClientId(event)
  const { getThemePrimaryColor } = await import('~/modules/theme/server/utils/theme')
  const accentColor = (await getThemePrimaryColor({ clientId: resolvedClientId }).catch(() => null)) || '#4F46E5'

  
  const archive = archiver('zip', { zlib: { level: 5 } })
  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  for (const order of orders) {
    const pdf = await generateInvoicePdf(order, shopName, accentColor, seller, labels)
    archive.append(pdf, { name: `facture-${order.invoiceNumber}-${order.reference}.pdf` })
  }

  await archive.finalize()

  
  const chunks: Buffer[] = []
  for await (const chunk of passthrough) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const zipBuffer = Buffer.concat(chunks)

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="factures-${clientId || 'export'}.zip"`,
    'Content-Length': String(zipBuffer.length),
  })

  return zipBuffer
})
