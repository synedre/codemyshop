

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { cachedFetch } from './redis'

const CACHE_TTL_SEC = 10 * 60

export const TRANSLATION_PRIORITY_SQL = sql.raw(`CASE WHEN domain LIKE 'tenant:%' THEN 0 WHEN domain = 'oss' THEN 1 ELSE 2 END, id_translation DESC`)

export async function t(key: string, idLang: number = 1, fallback: string = ''): Promise<string> {
  return cachedFetch<string>(
    `i18n:${key}:${idLang}`,
    CACHE_TTL_SEC,
    async () => {
      try {
        const rows = await usePocPg().execute<any>(sql`
          SELECT translation
            FROM cs_main.ps_translation
           WHERE key = ${key} AND id_lang = ${idLang}
           ORDER BY ${TRANSLATION_PRIORITY_SQL}
           LIMIT 1
        `) as any[]
        return rows[0]?.translation ? String(rows[0].translation) : fallback
      } catch (err: any) {
        console.warn(`[i18n] DB error key=${key} lang=${idLang}:`, err?.message)
        return fallback
      }
    },
  )
}

export function tFormat(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (m, k) =>
    vars[k] !== undefined ? String(vars[k]) : m,
  )
}
