

import type { VisitorAvatar } from '~/types/avatar'
import { resolveClientId } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const visitorId = getCookie(event, 'ac_visitor_id')

  if (!visitorId) {
    throw createError({ statusCode: 404, message: 'No visitor profile found' })
  }

  const clientId = String(config.aiClientId || resolveClientId())
  const storage  = useStorage('avatars')
  const key      = `${clientId}:${visitorId}`

  const avatar = await storage.getItem<VisitorAvatar>(key)

  if (!avatar) {
    throw createError({ statusCode: 404, message: 'No avatar computed yet' })
  }

  return avatar
})
