

import { getTourWithStops } from '~/modules/routing/server/utils/routing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const result = await getTourWithStops(id, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Tournée introuvable' })

  return { ok: true, tour: result.tour, stops: result.stops }
})
