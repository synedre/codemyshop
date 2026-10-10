

import { resolvePrice } from '~/enterprise/misc/pricing/server/utils/pricing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event)
  const idProduct  = Number(q.product)
  const idCustomer = Number(q.customer)
  const qty        = Number(q.qty ?? 1)

  if (!idProduct || !idCustomer) {
    throw createError({ statusCode: 400, statusMessage: 'product et customer requis' })
  }

  const { price, source, rule } = await resolvePrice(idCustomer, idProduct, qty, { event })
  return { ok: true, price, source, rule }
})
