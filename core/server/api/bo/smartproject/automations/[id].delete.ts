

import { deleteAutomationRule } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const idStr = getRouterParam(event, 'id')
  const idRule = Number(idStr)
  if (!idRule || idRule <= 0) {
    throw createError({ statusCode: 400, message: 'ID de règle invalide' })
  }
  const ok = await deleteAutomationRule(idRule, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Règle introuvable ou déjà supprimée' })
  }
  return { success: true }
})
