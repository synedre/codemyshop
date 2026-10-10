

import { deleteList } from '~/modules/quickorder/server/utils/quickorder'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteList(id, { event })
  return { ok: true }
})
