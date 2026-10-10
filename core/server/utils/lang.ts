

import type { H3Event } from 'h3'
import { useClientDb } from './db'
import { getRootLocale, localePrefix } from '~/utils/i18n-root-locale'

const langCache: Record<string, { map: Record<string, number>; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000

async function getLangMap(event: H3Event): Promise<Record<string, number>> {
  const db = useClientDb(event)
  const key = db.clientId
  const now = Date.now()

  if (langCache[key] && now - langCache[key].ts < CACHE_TTL) {
    return langCache[key].map
  }

  try {
    const rows = await db.query<{ id_lang: number; iso_code: string }>(
      `SELECT id_lang, iso_code FROM ps_lang WHERE active = 1`,
    )
    const map: Record<string, number> = {}
    for (const r of rows) {
      map[r.iso_code.toLowerCase()] = Number(r.id_lang)
    }
    langCache[key] = { map, ts: now }
    return map
  } catch {
    return { fr: 1 }
  }
}

export async function idLangFromIso(event: H3Event, iso?: string): Promise<number> {
  const key = String(iso ?? '').trim().toLowerCase()
  if (!key || key === 'fr') return 1
  if (!/^[a-z]{2}$/.test(key)) return 1
  const map = await getLangMap(event)
  return map[key] ?? 1
}

export function isoFromPathPrefix(
  path: string,
  allowedLocales: string[],
): string | undefined {
  const seg = String(path || '').split('/')[1]?.toLowerCase()
  if (!seg || !/^[a-z]{2}$/.test(seg)) return undefined
  return allowedLocales.includes(seg) ? seg : undefined
}

export function langPrefixFromConfig(
  publicConfig: { i18nDefaultLocale?: unknown } | null | undefined,
  iso?: string,
): string {
  const key = String(iso ?? '').trim().toLowerCase()
  if (!key) return ''
  return localePrefix(key, getRootLocale(publicConfig))
}

export function cardLangPrefix(
  explicit: string | undefined,
  publicConfig: { i18nDefaultLocale?: unknown } | null | undefined,
  iso?: string,
): string {
  return explicit ?? langPrefixFromConfig(publicConfig, iso)
}

export function langPrefixFor(event: H3Event, iso?: string): string {
  const config = useRuntimeConfig(event)
  return langPrefixFromConfig(config.public as { i18nDefaultLocale?: unknown }, iso)
}

async function fallbackIdLang(event: H3Event): Promise<number> {
  const config = useRuntimeConfig(event)
  const iso = String((config.public as Record<string, unknown>)?.i18nDefaultLocale ?? '')
  return idLangFromIso(event, iso)
}

export async function resolveIdLang(event: H3Event): Promise<number> {
  
  const q = getQuery(event)
  const raw = String(q.lang ?? '').trim().toLowerCase()

  
  const headerLang = raw || (getRequestHeader(event, 'x-lang') ?? '').trim().toLowerCase()

  if (!headerLang) return fallbackIdLang(event)

  
  const asNum = Number(headerLang)
  if (Number.isInteger(asNum) && asNum > 0) return asNum

  
  if (/^[a-z]{2}$/.test(headerLang)) {
    const map = await getLangMap(event)
    return map[headerLang] ?? (await fallbackIdLang(event))
  }

  return fallbackIdLang(event)
}

export async function getIsoLangMap(event: H3Event): Promise<Record<string, number>> {
  return getLangMap(event)
}

export async function resolveIsoLang(event: H3Event): Promise<string> {
  const config = useRuntimeConfig()
  const fallback = String((config.public as Record<string, unknown>).i18nDefaultLocale ?? '')
    .trim()
    .toLowerCase()

  const q = getQuery(event)
  const raw = String(q.lang ?? '').trim().toLowerCase()
  const candidate = raw || (getRequestHeader(event, 'x-lang') ?? '').trim().toLowerCase()

  if (!candidate) return fallback

  if (/^[a-z]{2}$/.test(candidate)) return candidate

  
  const asNum = Number(candidate)
  if (Number.isInteger(asNum) && asNum > 0) {
    const map = await getLangMap(event)
    const found = Object.entries(map).find(([, id]) => id === asNum)
    if (found) return found[0]
  }

  return fallback
}
