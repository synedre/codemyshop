

import { getOrderFromDb } from '~/server/utils/orders-db'
import { requireCustomer } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { clientId } = getQuery(event) as { clientId?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const session = requireCustomer(event)

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const order = await getOrderFromDb(id, ctx)
  
  
  if (!order || order.customerId !== session.customerId) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  return order
})
