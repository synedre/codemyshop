

import { deleteTaskTemplate } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const idStr = getRouterParam(event, 'id')
  const idTemplate = Number(idStr)
  if (!idTemplate || idTemplate <= 0) {
    throw createError({ statusCode: 400, message: 'ID de template invalide' })
  }
  const ok = await deleteTaskTemplate(idTemplate, { event })
  if (!ok) {
    throw createError({ statusCode: 404, message: 'Template introuvable' })
  }
  return { success: true }
})
