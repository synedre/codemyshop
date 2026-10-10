

import { analyzeVisitor } from '~/server/tasks/analyze-visitor'
import type { VisitorSignals } from '~/types/avatar'
import { randomUUID } from 'node:crypto'
import { resolveClientId } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const body    = await readBody<{ signals?: VisitorSignals }>(event)
  const signals = body?.signals ?? {}

  
  let visitorId = getCookie(event, 'ac_visitor_id')
  if (!visitorId) {
    visitorId = randomUUID()
    setCookie(event, 'ac_visitor_id', visitorId, {
      maxAge:   60 * 60 * 24 * 365, 
      httpOnly: false,
      sameSite: 'lax',
      path:     '/',
    })
  }

  const clientId = String(config.aiClientId || resolveClientId())

  
  const avatar = await analyzeVisitor(visitorId, clientId, signals)

  
  setCookie(event, 'ac_avatar_type', avatar.type, {
    maxAge:   60 * 60 * 24 * 30, 
    httpOnly: false,
    sameSite: 'lax',
    path:     '/',
  })

  return { ok: true, avatar }
})
