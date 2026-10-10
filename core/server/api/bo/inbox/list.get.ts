

import { getPgClient } from '~/server/utils/db-pg-adapter'

import { requireEmployeeSession } from '~/server/utils/session'

const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event)
  const from    = (q.from    ? String(q.from)    : '').trim()
  const subject = (q.subject ? String(q.subject) : '').trim()
  const status  = (q.status  ? String(q.status)  : '').trim()
  const days    = Math.min(Math.max(Number(q.days || 7), 1), 90)
  const limit   = Math.min(Math.max(Number(q.limit || 20), 1), 100)
  const wantBody = String(q.body || '') === '1'

  const sql = getPgClient()
  const fromLike    = from    ? `%${from}%`    : null
  const subjectLike = subject ? `%${subject}%` : null
  const statusVal   = status || null

  const rows = await sql<any[]>`
    SELECT
      e.id_email,
      e.imap_id,
      e.from_email,
      e.from_name,
      e.subject,
      e.date_received,
      e.client_name,
      e.client_priority,
      e.mrr,
      e.status,
      e.is_bug,
      e.bug_keyword,
      e.ai_severity,
      e.ai_summary,
      e.id_chantier,
      c.codename AS chantier_codename,
      c.title    AS chantier_title,
      ${wantBody ? sql`e.notes` : sql`NULL::text`} AS body,
      e.created_at
    FROM ${sql(PG_SCHEMA)}.cs_inbox_emails e
    LEFT JOIN ${sql(PG_SCHEMA)}.cs_chantier c ON c.id_chantier = e.id_chantier
    WHERE e.date_received >= NOW() - (${days} || ' days')::interval
      AND (${fromLike}::text IS NULL
            OR e.from_email   ILIKE ${fromLike}
            OR e.from_name    ILIKE ${fromLike}
            OR e.client_name  ILIKE ${fromLike})
      AND (${subjectLike}::text IS NULL OR e.subject ILIKE ${subjectLike})
      AND (${statusVal}::text IS NULL  OR e.status = ${statusVal})
    ORDER BY e.date_received DESC NULLS LAST
    LIMIT ${limit}
  `
  return {
    ok:    true,
    count: rows.length,
    rows,
  }
})
