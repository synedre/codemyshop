

import { listClientVpsForAdmin } from '~/internal/hub/server/utils/hub'
import { readHubSessionToken } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = readHubSessionToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const rows = await listClientVpsForAdmin(false)
  return rows.map((r: any) => ({
    ...r,
    config: r.config ? JSON.parse(r.config) : {},
  }))
})
