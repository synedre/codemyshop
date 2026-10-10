import { requireEmployeeSession } from '~/server/utils/session'

import {
  listCatchWeightProducts,
  listPendingWeighs,
  listWeighedLines,
} from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const [products, pending, weighed] = await Promise.all([
    listCatchWeightProducts({ event }),
    listPendingWeighs({ event }),
    listWeighedLines(50, { event }),
  ])
  return { ok: true, products, pending, weighed }
})
