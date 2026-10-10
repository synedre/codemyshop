

import { listFreightRulesWithScopeLabel } from '~/modules/freight-rule/server/utils/freight-rule'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const rules = await listFreightRulesWithScopeLabel({ event })
  return { ok: true, rules }
})
