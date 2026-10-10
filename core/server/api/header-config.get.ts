

import { resolveClientId } from '~/server/utils/db'
import { resolveHeaderConfig } from '~/server/utils/header-config'

export default defineEventHandler(async (event) => {
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)
  const clientId = resolveClientId(event)

  const { header, degraded } = await resolveHeaderConfig(event, clientId, idLang)
  if (degraded) setResponseHeader(event, 'x-shell-degraded', '1')
  return { header }
})
