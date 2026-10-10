

import { deleteExpiryRule } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteExpiryRule(id, { event })
  return { ok: true }
})
