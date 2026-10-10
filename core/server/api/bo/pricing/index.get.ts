

import { listGroups, listTiers, listContracts } from '~/enterprise/misc/pricing/server/utils/pricing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const [groups, tiers, contracts] = await Promise.all([
    listGroups({ event }),
    listTiers({ event }),
    listContracts({ event }),
  ])
  return { ok: true, groups, tiers, contracts }
})
