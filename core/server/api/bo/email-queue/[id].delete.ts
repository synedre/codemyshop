

import { cancelQueuedEmail } from '~/server/utils/email-queue'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const cancelled = await cancelQueuedEmail(id)
  if (!cancelled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Email introuvable ou non annulable (déjà envoyé / en cours / annulé)',
    })
  }
  return { ok: true }
})
