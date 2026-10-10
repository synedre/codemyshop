

import { listAutomationRules } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const automations = await listAutomationRules({ event })
  return { success: true, automations }
})
