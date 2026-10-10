

import { processEmailQueue } from '~/server/utils/email-queue'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const body = await readBody(event).catch(() => ({})) as { limit?: number }
  const limit = Math.max(1, Math.min(20, Number(body?.limit) || 5))

  const outcome = await processEmailQueue({ limit })
  return {
    ok: true,
    scanned:   outcome.scanned,
    processed: outcome.processed,
    errors:    outcome.errors,
    items:     outcome.items,
  }
})
