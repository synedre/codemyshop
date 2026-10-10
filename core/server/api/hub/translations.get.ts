

import { useClientDb, useClientDbById } from '~/server/utils/db'
import { loadTranslations } from '~/server/utils/translations-load'

export default defineEventHandler(async (event) => {
  const { lang, clientId: qClientId } = getQuery(event) as { lang?: string; clientId?: string }
  
  
  const db = qClientId ? useClientDbById(qClientId) : useClientDb(event)
  return await loadTranslations(db, lang || 'fr', 'full')
})
