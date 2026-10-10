

import { deleteTour } from '~/modules/routing/server/utils/routing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  await deleteTour(id, { event })
  return { ok: true }
})
