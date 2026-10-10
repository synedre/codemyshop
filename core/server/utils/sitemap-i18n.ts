

import { localizeRootSegment } from '~/utils/locale-route-roots'
import { DEFAULT_ROOT_LOCALE, PIVOT_LOCALE } from '~/utils/i18n-root-locale'
import { estMarcheOuvert, loadMarketLock } from './i18n-market'

export const SITEMAP_XHTML_NS = ' xmlns:xhtml="http://www.w3.org/1999/xhtml"'

export function sitemapBaseUrl(event: any): string {
  const front = ((useRuntimeConfig().public as any)?.psFrontUrl as string) || ''
  if (front) return front.replace(/\/$/, '')
  const host = (getRequestHost(event) || '').split(':')[0]
  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) return 'https://example.com'
  return `https://${host}`
}

export const SITEMAP_PRODUCT_PAGE_SIZE = 45000

export function sitemapProductPageSize(nLangs: number): number {
  return Math.floor(SITEMAP_PRODUCT_PAGE_SIZE / Math.max(1, Math.floor(nLangs) || 1))
}

export interface ActiveLang {
  id_lang: number
  iso_code: string
}

export function selectSitemapProductLangs(
  langs: ActiveLang[],
  configuredLocales: unknown,
): ActiveLang[] {
  if (!Array.isArray(configuredLocales)) return langs
  const allowed = new Set(
    configuredLocales
      .filter((locale): locale is string => typeof locale === 'string')
      .map(locale => locale.trim().toLowerCase())
      .filter(Boolean),
  )
  if (!allowed.size) return langs
  const selected = langs.filter(lang => allowed.has(lang.iso_code.toLowerCase()))
  return selected.length ? selected : langs
}

export async function loadActiveLangs(
  db: any,
  locales: string[] = ['en'],
  rootLocale: string = DEFAULT_ROOT_LOCALE,
): Promise<ActiveLang[]> {
  try {
    const rows = await db.query<ActiveLang>(
      `SELECT id_lang, iso_code FROM ps_lang WHERE active = 1 ORDER BY id_lang ASC`,
    )
    if (!rows.length) return [{ id_lang: 1, iso_code: 'fr' }]
    const whitelist = new Set<string>([rootLocale, ...locales])
    const lock = await loadMarketLock(db)
    return rows.filter(r => whitelist.has(r.iso_code) && estMarcheOuvert(r.iso_code, lock, rootLocale))
  } catch {
    return [{ id_lang: 1, iso_code: 'fr' }]
  }
}

export function buildLocalizedPath(
  rawPath: string,
  iso: string,
  rootMap?: Record<string, Record<string, string>>,
  rootLocale: string = DEFAULT_ROOT_LOCALE,
): string {
  if (!rawPath.startsWith('/')) rawPath = '/' + rawPath
  const prefix = iso === rootLocale ? '' : `/${iso}`
  
  
  
  
  if (rawPath === '/') return prefix || '/'
  
  if (iso === PIVOT_LOCALE) return `${prefix}${rawPath}`
  
  
  const firstSlash = rawPath.indexOf('/', 1)
  const firstSeg = firstSlash > 0 ? rawPath.slice(1, firstSlash) : rawPath.slice(1)
  const rest = firstSlash > 0 ? rawPath.slice(firstSlash) : ''
  const translatedRoot = rootMap?.[iso]?.[firstSeg] ?? localizeRootSegment(firstSeg, iso)
  return `${prefix}/${translatedRoot}${rest}`
}

export async function loadRootSegmentMap(
  db: any,
): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {}
  try {
    const isoById: Record<number, string> = { 2: 'en', 3: 'de', 4: 'es', 5: 'it' }
    const rows = await db.query<{ id_category: number; id_lang: number; link_rewrite: string }>(
      `SELECT c.id_category, cl.id_lang, cl.link_rewrite
         FROM ps_category c
         JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_shop = 1
        WHERE c.active = 1 AND c.level_depth = 2 AND cl.id_lang IN (1,2,3,4,5)`,
    )
    const byCat: Record<number, Record<number, string>> = {}
    for (const r of rows) (byCat[r.id_category] ||= {})[r.id_lang] = r.link_rewrite
    for (const langs of Object.values(byCat)) {
      const fr = langs[1]
      if (!fr) continue
      for (const [idLang, iso] of Object.entries(isoById)) {
        const loc = langs[Number(idLang)]
        if (loc && loc !== fr) (out[iso] ||= {})[fr] = loc
      }
    }
  } catch {  }
  return out
}

export async function loadLocalizedSlugMap(
  db: any,
  table: string,
  masterTable: string,
  idCol: string,
  pathCol: string,
  masterSlugCol: string,
  slugCol: string,
  kind?: string,
): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>()
  try {
    const kindFilter = kind ? `AND m.kind='${kind}'` : ''
    const rows = await db.query<any>(
      `SELECT m.${pathCol} AS master_path, m.${masterSlugCol} AS master_slug,
              l.id_lang, l.${slugCol} AS slug_lang
         FROM ${masterTable} m
         JOIN ${table} l ON l.${idCol} = m.${idCol}
         JOIN ps_lang ps ON ps.id_lang = l.id_lang AND ps.active = 1
        WHERE m.active = 1 ${kindFilter}`,
    )
    
    const byPathIso = new Map<string, Record<number, string>>()
    const idLangToIso = new Map<number, string>()
    const isoRows = await db.query<ActiveLang>(`SELECT id_lang, iso_code FROM ps_lang WHERE active = 1`)
    for (const r of isoRows) idLangToIso.set(r.id_lang, r.iso_code)
    for (const r of rows) {
      if (!byPathIso.has(r.master_path)) byPathIso.set(r.master_path, {})
      byPathIso.get(r.master_path)![r.id_lang] = r.slug_lang || r.master_slug
    }
    for (const [path, byIso] of byPathIso) {
      const isoMap: Record<string, string> = {}
      for (const [idLangStr, slug] of Object.entries(byIso)) {
        const iso = idLangToIso.get(Number(idLangStr))
        if (iso) isoMap[iso] = slug
      }
      map.set(path, isoMap)
    }
  } catch {  }
  return map
}

export function buildLocalizedSiloPath(
  masterPath: string,
  iso: string,
  slugMap: Map<string, Record<string, string>>,
): string {
  if (iso === 'fr' || !masterPath) return masterPath
  const segs = masterPath.split('/')
  const out: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const partial = segs.slice(0, i + 1).join('/')
    const entry = slugMap.get(partial)
    out.push(entry?.[iso] || segs[i])
  }
  return out.join('/')
}

export function buildBlogUrl(
  base: string,
  iso: string,
  rootSlug: string,
  path: string,
  trailingSlash: boolean,
  rootLocale: string = DEFAULT_ROOT_LOCALE,
): string {
  const prefix = iso === rootLocale ? '' : `/${iso}`
  
  
  
  const segs = [rootSlug, path]
    .map(s => String(s || '').replace(/^\/+|\/+$/g, ''))
    .filter(s => s.length)
    .join('/')
  return `${base}${prefix}/${segs}${trailingSlash ? '/' : ''}`
}

export function articleIdsAcrossLangs(
  byIso: Map<string, Map<number, string>>,
  pivotIso: string = PIVOT_LOCALE,
): number[] {
  const out: number[] = []
  const vus = new Set<number>()
  const ordre = [pivotIso, ...[...byIso.keys()].filter(k => k !== pivotIso)]
  for (const iso of ordre) {
    for (const id of byIso.get(iso)?.keys() ?? []) {
      if (vus.has(id)) continue
      vus.add(id)
      out.push(id)
    }
  }
  return out
}

export function unArticleParLoc(ids: number[], locOf: (id: number) => string | null): number[] {
  const retenuPour = new Map<string, number>()
  for (const id of ids) {
    const loc = locOf(id)
    if (!loc) continue
    const deja = retenuPour.get(loc)
    if (deja === undefined || id < deja) retenuPour.set(loc, id)
  }
  const retenus = new Set(retenuPour.values())
  return ids.filter(id => retenus.has(id))
}

export function pickSitemapLoc(
  variants: Array<{ iso: string; url: string }>,
  rootLocale: string = DEFAULT_ROOT_LOCALE,
  pivotIso: string = PIVOT_LOCALE,
): string | null {
  return variants.find(v => v.iso === rootLocale)?.url
    || variants.find(v => v.iso === pivotIso)?.url
    || variants[0]?.url
    || null
}

export function buildUrlEntry(
  loc: string,
  langsWithUrls: Array<{ iso: string; url: string }>,
  lastmod: string | null | undefined,
  changefreq: string,
  priority: string,
  rootLocale: string = DEFAULT_ROOT_LOCALE,
): string {
  let x = `  <url>\n`
  x += `    <loc>${escapeXml(loc)}</loc>\n`
  
  
  
  if (lastmod) x += `    <lastmod>${lastmod}</lastmod>\n`
  x += `    <changefreq>${changefreq}</changefreq>\n`
  x += `    <priority>${priority}</priority>\n`
  for (const { iso, url } of langsWithUrls) {
    x += `    <xhtml:link rel="alternate" hreflang="${iso}" href="${escapeXml(url)}" />\n`
  }
  
  
  
  
  
  const xDefault = pickSitemapLoc(langsWithUrls, rootLocale)
  if (xDefault) x += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefault)}" />\n`
  x += `  </url>\n`
  return x
}

export function orderedSitemapVariants(
  variants: Array<{ iso: string; url: string }>,
  rootLocale: string = DEFAULT_ROOT_LOCALE,
): Array<{ iso: string; url: string }> {
  const first = pickSitemapLoc(variants, rootLocale)
  const ordre = [...variants.filter(v => v.url === first), ...variants.filter(v => v.url !== first)]
  const vues = new Set<string>()
  return ordre.filter(v => !vues.has(v.url) && vues.add(v.url))
}

export function buildUrlEntries(
  langsWithUrls: Array<{ iso: string; url: string }>,
  lastmod: string | null | undefined,
  changefreq: string,
  priority: string,
  rootLocale: string = DEFAULT_ROOT_LOCALE,
): string {
  return orderedSitemapVariants(langsWithUrls, rootLocale)
    .map(v => buildUrlEntry(v.url, langsWithUrls, lastmod, changefreq, priority, rootLocale))
    .join('')
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
