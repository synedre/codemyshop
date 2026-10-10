

import { seedFromAutoblog } from '~/server/utils/centaure-embed'
import { readHubSessionToken } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = readHubSessionToken<any>(getCookie(event, 'hub_session'))
  if (!session?.isAdmin) {
    throw createError({ statusCode: 403, message: 'Réservé aux administrateurs' })
  }
  const report = await seedFromAutoblog()
  return { ok: true, ...report }
})
