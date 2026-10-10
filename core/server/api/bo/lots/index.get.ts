

import { listLots, getLotsStats, type ExpiryWindow } from '~/enterprise/vertical-food/lot/server/utils/lot'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event) as Record<string, string>
  const [lots, stats] = await Promise.all([
    listLots(
      {
        search: q.search,
        expiryWindow: (q.expiryWindow as ExpiryWindow) || 'all',
        limit: Number(q.limit || 100),
      },
      { event },
    ),
    getLotsStats({ event }),
  ])
  return { ok: true, lots, stats }
})
