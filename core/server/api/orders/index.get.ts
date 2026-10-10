

import { getOrdersForCustomer } from '~/server/utils/orders-db'
import { requireCustomer } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const { customerId } = requireCustomer(event)
  const { limit, clientId } = getQuery(event) as Record<string, string>

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  return getOrdersForCustomer(customerId, Math.min(Number(limit) || 20, 100), ctx)
})
