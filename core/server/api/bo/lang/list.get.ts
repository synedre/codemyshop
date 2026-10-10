

import { useClientDb } from '~/server/utils/db'
import type { HubLang, HubLangListResponse } from '~/types/hub/lang'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event): Promise<HubLangListResponse> => {
  requireEmployeeSession(event)
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT id_lang, iso_code, name, active
      FROM ps_lang
     WHERE active = 1
     ORDER BY id_lang ASC
  `)

  const langs: HubLang[] = rows.map((r) => ({
    id_lang: Number(r.id_lang),
    iso_code: String(r.iso_code || '').toLowerCase(),
    name: String(r.name || ''),
    is_default: Number(r.id_lang) === 1,
    active: !!r.active,
  }))

  return { langs, default_id: 1 }
})
