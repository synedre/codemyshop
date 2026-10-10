

import { deleteFoodForProduct } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteFoodForProduct(id, { event })
  return { ok: true }
})
