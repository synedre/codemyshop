

import { listDrivers } from '~/modules/routing/server/utils/routing'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const drivers = await listDrivers({ event })
  return { ok: true, drivers }
})
