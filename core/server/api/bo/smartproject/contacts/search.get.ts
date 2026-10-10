

import { searchSmartleadContacts } from '~/enterprise/base/smartproject/server/utils/smartproject'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = String(getQuery(event).q || '').trim()
  const contacts = await searchSmartleadContacts(q, { event })
  return { success: true, contacts }
})
