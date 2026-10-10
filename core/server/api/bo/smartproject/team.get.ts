

import { listTeamMembers } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const members = await listTeamMembers({ event })
  return { success: true, members }
})
