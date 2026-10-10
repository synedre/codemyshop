

import { getLastActiveCartFromDb } from '~/server/utils/cart-db'
import { requireCustomer, resolveCustomerIdForRequest } from '~/server/utils/customer-session'
import { issueCartProof } from '~/server/utils/cart-proof'

export default defineEventHandler(async (event) => {
  requireCustomer(event)
  const { customerId, clientId } = getQuery(event) as { customerId?: string; clientId?: string }
  const resolvedId = resolveCustomerIdForRequest(event, customerId)
  if (!resolvedId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const cart = await getLastActiveCartFromDb(resolvedId, ctx)
  if (cart) issueCartProof(event, cart.id, resolvedId)
  return cart
})
