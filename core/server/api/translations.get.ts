

import { useClientDb, useClientDbById } from '~/server/utils/db'
import { loadTranslations, parseScope } from '~/server/utils/translations-load'

export default defineEventHandler(async (event) => {
  const { lang, clientId: qClientId, scope } = getQuery(event) as {
    lang?: string; clientId?: string; scope?: string
  }
  const db = qClientId ? useClientDbById(qClientId) : useClientDb(event)
  return await loadTranslations(db, lang || 'fr', parseScope(scope))
})
