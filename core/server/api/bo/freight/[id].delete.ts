

import { deleteFreightRule } from '~/modules/freight-rule/server/utils/freight-rule'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteFreightRule(id, { event })
  return { ok: true }
})
