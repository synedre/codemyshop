

import { listQuickOrderLists } from '~/modules/quickorder/server/utils/quickorder'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const lists = await listQuickOrderLists({ event })
  return { ok: true, lists }
})
