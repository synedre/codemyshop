

import { removeFromCartInDb } from '~/server/utils/cart-db'
import { assertCartAccess } from '~/server/utils/cart-proof'

export default defineEventHandler(async (event) => {
  const { cartId, productId, combinationId, customizationId, clientId } = getQuery(event) as Record<string, string>
  if (!cartId || !productId) throw createError({ statusCode: 400, message: 'cartId et productId requis' })

  await assertCartAccess(event, cartId)

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  await removeFromCartInDb(Number(cartId), Number(productId), Number(combinationId || 0), ctx, Number(customizationId || 0))
  return { success: true }
})
