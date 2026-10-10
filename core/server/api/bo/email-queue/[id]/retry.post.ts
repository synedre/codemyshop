

import { retryQueuedEmail } from '~/server/utils/email-queue'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const ok = await retryQueuedEmail(id)
  if (!ok) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Email introuvable ou non retryable (uniquement failed/cancelled)',
    })
  }
  return { ok: true }
})
