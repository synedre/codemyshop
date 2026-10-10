

import { deleteProductCatchWeight } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'idProduct'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'idProduct invalide' })
  await deleteProductCatchWeight(id, { event })
  return { ok: true }
})
