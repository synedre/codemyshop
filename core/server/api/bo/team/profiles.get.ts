

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'
import { HUB_PROFILE_IDS } from '~/server/utils/roles'

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  
  const allowedIds = (isSaas ? HUB_PROFILE_IDS : HUB_PROFILE_IDS.filter(id => id !== 1))
    .join(',')

  const profiles = await db.query<any>(`
    SELECT
      p.id_profile AS id,
      COALESCE(pl.name, CONCAT('Profil #', p.id_profile)) AS name
    FROM ps_profile p
    LEFT JOIN ps_profile_lang pl ON pl.id_profile = p.id_profile AND pl.id_lang = ?
    WHERE p.id_profile IN (${allowedIds})
    ORDER BY p.id_profile ASC
  `, [langId])

  return { profiles, viewerIsSaas: isSaas }
})
