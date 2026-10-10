

import { resolveClientId } from '~/server/utils/db'
export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const visitorId = getCookie(event, 'ac_visitor_id')

  if (visitorId) {
    const clientId = String(config.aiClientId || resolveClientId())
    const storage  = useStorage('avatars')
    await storage.removeItem(`${clientId}:${visitorId}`)
  }

  
  setCookie(event, 'ac_avatar_type', '', { maxAge: 0, path: '/' })
  setCookie(event, 'ac_visitor_id',  '', { maxAge: 0, path: '/' })

  return { ok: true }
})
