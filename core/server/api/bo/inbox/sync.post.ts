

import { runInboxSync } from '~/server/tasks/inbox/sync'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  try {
    const result = await runInboxSync()
    return { ok: true, result }
  } catch (err: any) {
    console.error('[bo/inbox/sync] ', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Erreur sync inbox' })
  }
})
