

import { listWaTemplates } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const templates = await listWaTemplates({ event })
  return { success: true, templates }
})
