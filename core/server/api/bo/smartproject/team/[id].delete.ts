

import { deleteTeamMember } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const idStr = getRouterParam(event, 'id')
  const idMember = Number(idStr)
  if (!idMember || idMember <= 0) {
    throw createError({ statusCode: 400, message: 'ID du membre invalide' })
  }
  const ok = await deleteTeamMember(idMember, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Membre introuvable ou déjà supprimé' })
  }
  return { success: true, message: 'Membre supprimé avec succès' }
})
