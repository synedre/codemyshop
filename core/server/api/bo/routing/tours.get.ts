

import { listTours } from '~/modules/routing/server/utils/routing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event)
  const date = String(q.date || '').trim() || null
  const tours = await listTours(date, { event })
  return { ok: true, tours }
})
