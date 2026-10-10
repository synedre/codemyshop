

import { updateGroup } from '~/enterprise/misc/pricing/server/utils/pricing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const body = await readBody<{
    name?: string
    priority?: number
    active?: number
  }>(event)

  await updateGroup(id, body, { event })
  return { ok: true }
})
