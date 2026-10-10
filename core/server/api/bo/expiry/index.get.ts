

import { listActiveExpiryRules, listExpiringLots } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const [rules, lots] = await Promise.all([
    listActiveExpiryRules({ event }),
    listExpiringLots(14, { event }),
  ])
  return { ok: true, rules, lots }
})
