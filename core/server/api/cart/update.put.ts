

import { updateCartItemInDb, getCartFromDb } from '~/server/utils/cart-db'
import { assertCartAccess } from '~/server/utils/cart-proof'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const { cartId, productId, quantity, combinationId, clientId } = body || {}
  if (!cartId || !productId) throw createError({ statusCode: 400, message: 'cartId et productId requis' })

  await assertCartAccess(event, cartId)

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  await updateCartItemInDb(Number(cartId), Number(productId), Number(quantity || 0), Number(combinationId || 0), ctx, Number(body?.customizationId || 0))
  const cart = await getCartFromDb(Number(cartId), ctx)
  if (!cart) throw createError({ statusCode: 404, message: 'Panier introuvable' })
  return cart
})
