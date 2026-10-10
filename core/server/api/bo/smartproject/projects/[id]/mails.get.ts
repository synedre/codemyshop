

import { listProjectMails } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID de projet invalide' })
  }
  const result = await listProjectMails(idProject, { event })
  
  return {
    success: true,
    emails: result.mails,
    project_name: result.project_name,
    contact_infos: result.contact_infos,
  }
})
