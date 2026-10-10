

import { listActiveRedirects } from '~/modules/redirect/server/utils/redirect'
import { ALL_POSSIBLE_LOCALES, localizeRootSegment, ROOT_CANONICAL_FR } from '~/utils/locale-route-roots'
import { getRootLocale, getRetiredLocales, localePrefix, PIVOT_LOCALE } from '~/utils/i18n-root-locale'
import {
  isLiveCategoryPath, resolveFullPath,
  type CategoryTree, type LiveRoots, type RootAliases,
} from '~/server/utils/root-normalize'
import { buildCmsCategoryTree, type CmsCategoryTree } from '~/server/utils/cms-path'
import { loadBlogRootId } from '~/server/utils/blog-tree'
import { resolveLegacyBlogPath, type BlogLegacyIndex } from '~/server/utils/blog-legacy-resolve'

interface RootCache {
  live: LiveRoots
  aliases: RootAliases
  

  tree: CategoryTree
  

  knownTree: CategoryTree
  

  cmsSlugs: Set<string>
  loadedAt: number
  available: boolean
}
let rootCache: RootCache | null = null
let rootLoading: Promise<RootCache> | null = null

const EMPTY_TREE: CategoryTree = { childBySlug: {}, slugById: {}, rootIdByFr: {} }

async function loadRootCache(event: any): Promise<RootCache> {
  const empty: RootCache = { live: {}, aliases: {}, tree: EMPTY_TREE, knownTree: EMPTY_TREE, cmsSlugs: new Set(), loadedAt: Date.now(), available: false }
  try {
    const db = useClientDb(event)
    
    
    
    const rows = await db.query<{
      id: number; parent: number; depth: number; slug: string; fr: string; iso: string; active?: number
    }>(
      `SELECT c.id_category AS id, c.id_parent AS parent, c.level_depth AS depth,
              cl.link_rewrite AS slug, clf.link_rewrite AS fr, l.iso_code AS iso, c.active AS active
         FROM ps_category c
         JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
         JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_shop = 1
         JOIN ps_lang l ON l.id_lang = cl.id_lang AND l.active = 1`,
    )
    if (!rows.length) return empty

    const tree: CategoryTree = { childBySlug: {}, slugById: {}, rootIdByFr: {} }
    const knownTree: CategoryTree = { childBySlug: {}, slugById: {}, rootIdByFr: tree.rootIdByFr }
    const next: RootCache = { live: {}, aliases: {}, tree, knownTree, cmsSlugs: new Set(), loadedAt: Date.now(), available: true }
    for (const r of rows) {
      if (!r.slug || !r.fr) continue
      knownTree.childBySlug[`${r.iso}|${r.parent}|${r.slug}`] = Number(r.id)
      
      if (r.active != null && Number(r.active) !== 1) continue
      tree.slugById[`${r.iso}|${r.id}`] = r.slug
      tree.childBySlug[`${r.iso}|${r.parent}|${r.slug}`] = Number(r.id)
      if (Number(r.depth) === 2) {
        next.live[r.slug] = { canonicalFr: r.fr, iso: r.iso }
        tree.rootIdByFr[r.fr] = Number(r.id)
      }
    }
    
    try {
      const al = await db.query<{ alias: string; canonical_fr: string }>(
        `SELECT alias, canonical_fr FROM cs_root_alias WHERE active = 1`,
      )
      for (const a of al) next.aliases[a.alias] = a.canonical_fr
    } catch {  }

    
    
    
    
    try {
      const cms = await db.query<{ slug: string }>(
        `SELECT l.link_rewrite AS slug
           FROM ps_cms_lang l JOIN ps_cms m ON m.id_cms = l.id_cms AND m.active = 1`,
      )
      for (const r of cms) if (r.slug) next.cmsSlugs.add(r.slug)
    } catch {  }

    return next
  } catch (err: any) {
    console.error('[legacy-redirects] chargement racines :', err?.message)
    return empty
  }
}

async function getRootCache(event: any): Promise<RootCache> {
  const now = Date.now()
  if (rootCache && now - rootCache.loadedAt < CACHE_TTL_MS) return rootCache
  if (rootLoading) return rootLoading
  rootLoading = loadRootCache(event).then((c) => {
    rootCache = c
    rootLoading = null
    return c
  })
  return rootLoading
}

const CACHE_TTL_MS = 5 * 60 * 1000

interface RedirectEntry {
  target: string
  code: number
  

  kind: string
  id: number | null
}

const ANY_LANG = '*'

interface RedirectCache {
  byPath: Map<string, RedirectEntry>
  
  byCatId: Map<string, RedirectEntry>
  byProductId: Map<string, RedirectEntry>
  loadedAt: number
  available: boolean
}

function localeOfPath(path: string, allowedLocales: string[], rootLocale: string): string {
  const first = (path || '').split('/').filter(Boolean)[0]
  if (first && first !== rootLocale && allowedLocales.includes(first)) return first
  return rootLocale
}

function indexById(
  map: Map<string, RedirectEntry>, id: number, iso: string, rootLocale: string, entry: RedirectEntry,
): void {
  map.set(`${iso}|${id}`, entry)
  
  
  const anyKey = `${ANY_LANG}|${id}`
  if (!map.has(anyKey) || iso === rootLocale) map.set(anyKey, entry)
}

function pickById(map: Map<string, RedirectEntry>, id: number, iso: string): RedirectEntry | undefined {
  return map.get(`${iso}|${id}`) ?? map.get(`${ANY_LANG}|${id}`)
}

let cache: RedirectCache | null = null
let loading: Promise<RedirectCache> | null = null

async function loadCache(event: any): Promise<RedirectCache> {
  const empty: RedirectCache = {
    byPath: new Map(),
    byCatId: new Map(),
    byProductId: new Map(),
    loadedAt: Date.now(),
    available: false,
  }

  try {
    const rows = await listActiveRedirects({ event })
    if (!rows.length) return empty

    const next: RedirectCache = {
      byPath: new Map(),
      byCatId: new Map(),
      byProductId: new Map(),
      loadedAt: Date.now(),
      available: true,
    }

    const cfg = useRuntimeConfig(event).public as any
    const locales = (cfg?.i18nLocales as string[]) || []
    const root = getRootLocale(cfg)
    const retired = getRetiredLocales(cfg)

    for (const r of rows) {
      const entry: RedirectEntry = {
        target: r.targetPath,
        code: r.statusCode || 301,
        kind: r.sourceKind,
        id: r.sourceId,
      }
      next.byPath.set(r.sourcePath, entry)
      
      
      
      const firstSeg = String(r.sourcePath || '').split('/').filter(Boolean)[0]
      if (firstSeg && retired.includes(firstSeg)) continue
      if (r.sourceId != null) {
        const iso = localeOfPath(r.sourcePath, locales, root)
        if (r.sourceKind === 'category') indexById(next.byCatId, r.sourceId, iso, root, entry)
        else if (r.sourceKind === 'product') indexById(next.byProductId, r.sourceId, iso, root, entry)
      }
    }
    return next
  } catch (err: any) {
    console.error('[legacy-redirects] Erreur chargement cache :', err?.message)
    return empty
  }
}

async function getCache(event: any): Promise<RedirectCache> {
  const now = Date.now()
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache
  if (loading) return loading
  loading = loadCache(event).then((c) => {
    cache = c
    loading = null
    return c
  })
  return loading
}

const PRODUCT_RE     = /^\/(?:([a-z]{2})\/)?(\d+)-[^/]*\.html$/
const CATEGORY_RE    = /^\/(?:([a-z]{2})\/)?(\d+)-[^/]*\/?$/

const PRODUIT_ID_RE  = /^\/(?:([a-z]{2})\/)?produit\/(\d+)(?:-[^/]*)?$/

const TRAILING_ID_RE = /^\/(?:([a-z]{2})\/)?(?:.+\/)?[^/]+-(\d+)\/?$/

const BARE_PRODUCT_SLUG_RE = /^\/(?:([a-z]{2})\/)?([^/]+)\/?$/

const LEGACY_HTML_SLUG_RE = /^\/(?:([a-z]{2})\/)?(?:[^/]+\/)*([^/]+?)\.html$/

const BLOG_LEGACY_RE = /^\/(?:([a-z]{2})\/)?blog\/(\d+)_[^/]*\.html$/

const PS17_PRODUCT_SEG_RE = /^(\d+)-(.+?)(?:\.html)?$/

const LEGACY_CMS_RE = /^\/(?:([a-z]{2})\/)?content\/([^/]+?)\/?$/

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function sameRoute(a: string, b: string): boolean {
  const norm = (s: string) => safeDecode(s).replace(/\/+$/, '') || '/'
  return norm(a) === norm(b)
}

function localizeTarget(targetFr: string, lang: string | undefined, allowedLocales: string[]): string | null {
  if (!lang) return targetFr
  if (lang === 'fr') return targetFr
  if (!allowedLocales.includes(lang)) return null
  if (!ALL_POSSIBLE_LOCALES.includes(lang)) return null
  if (!targetFr.startsWith('/')) return null
  
  
  
  
  
  if (targetFr === `/${lang}` || targetFr.startsWith(`/${lang}/`)) return targetFr
  const firstSlash = targetFr.indexOf('/', 1)
  const firstSeg = firstSlash > 0 ? targetFr.slice(1, firstSlash) : targetFr.slice(1)
  const rest = firstSlash > 0 ? targetFr.slice(firstSlash) : ''
  
  
  if (!ROOT_CANONICAL_FR.has(firstSeg)) return `/${lang}${targetFr}`
  return `/${lang}/${localizeRootSegment(firstSeg, lang)}${rest}`
}

async function canonicalUrlForLang(
  event: any,
  db: any,
  kind: 'product' | 'category',
  id: number,
  lang: string | undefined,
  allowedLocales: string[],
): Promise<string | null> {
  
  
  
  
  
  
  
  
  
  
  
  const rootLocale = getRootLocale(useRuntimeConfig(event).public)
  if (lang && lang !== rootLocale) {
    if (!allowedLocales.includes(lang)) return null
    if (lang !== PIVOT_LOCALE && !ALL_POSSIBLE_LOCALES.includes(lang)) return null
  }
  
  const iso = lang || rootLocale
  
  
  
  
  const langPrefix = localePrefix(iso, rootLocale)
  try {
    const { idLangFromIso } = await import('~/server/utils/lang')
    const idLang = await idLangFromIso(event, iso)
    const mod = await import('~/server/utils/product-url')
    const resolved = kind === 'product'
      ? await mod.getProductUrl(db, id, idLang, { event, iso, langPrefix })
      : await mod.getCategoryUrl(db, id, idLang, { event, iso, langPrefix })
    
    
    
    
    
    
    
    
    
    if (kind === 'product' && resolved === `/produit/${id}`) return null
    
    
    
    
    
    
    if (kind === 'category' && segmentCount(resolved, allowedLocales, rootLocale) === 0) return null
    
    
    
    
    if (kind === 'category' && resolved && !resolved.endsWith('/')) return `${resolved}/`
    return resolved || null
  } catch {
    return null
  }
}

const MIN_TARGET_SEGMENTS = 2

function segmentCount(path: string, allowedLocales: string[], rootLocale: string): number {
  const segs = (path || '').split('?')[0].split('/').filter(Boolean)
  if (segs.length && segs[0] !== rootLocale && allowedLocales.includes(segs[0])) segs.shift()
  return segs.length
}

async function retiredEntityTarget(
  event: any,
  db: any,
  kind: 'product' | 'category',
  id: number,
  lang: string | undefined,
  allowedLocales: string[],
): Promise<string | null | undefined> {
  let row: { active: number; parent: number } | null = null
  try {
    
    
    
    row = kind === 'product'
      ? await db.get(
          `SELECT p.active AS active, p.id_category_default AS parent
             FROM ps_product p WHERE p.id_product = ? LIMIT 1`,
          [id],
        )
      : await db.get(
          `SELECT c.active AS active, c.id_parent AS parent
             FROM ps_category c WHERE c.id_category = ? LIMIT 1`,
          [id],
        )
  } catch {
    return undefined 
  }
  
  if (!row) return undefined
  if (Number(row.active) === 1) return undefined

  const parent = Number(row.parent) || 0
  if (!parent) return null

  const rootLocale = getRootLocale(useRuntimeConfig(event).public)
  const resolved = await canonicalUrlForLang(event, db, 'category', parent, lang, allowedLocales)
  if (!resolved) return null
  if (segmentCount(resolved, allowedLocales, rootLocale) < MIN_TARGET_SEGMENTS) return null
  return resolved
}

function gone(): never {
  throw createError({ statusCode: 410, statusMessage: 'Gone' })
}

async function isDeletedProductId(db: any, id: number): Promise<boolean> {
  try {
    const row: { present: number | null; max_id: number | null } | null = await db.get(
      `SELECT (SELECT 1 FROM ps_product WHERE id_product = ?) AS present,
              (SELECT max(id_product) FROM ps_product) AS max_id`,
      [id],
    )
    return !!row && !row.present && Number(row.max_id) >= id
  } catch {
    return false
  }
}

async function isDeletedCmsId(db: any, id: number): Promise<boolean> {
  try {
    const row: { present: number | null; max_id: number | null } | null = await db.get(
      `SELECT (SELECT 1 FROM ps_cms WHERE id_cms = ?) AS present,
              (SELECT max(id_cms) FROM ps_cms) AS max_id`,
      [id],
    )
    return !!row && !row.present && Number(row.max_id) >= id
  } catch {
    return false
  }
}

let blogIndex: (BlogLegacyIndex & { loadedAt: number }) | null = null
let blogLoading: Promise<BlogLegacyIndex & { loadedAt: number }> | null = null

async function loadBlogIndex(event: any): Promise<BlogLegacyIndex & { loadedAt: number }> {
  const vide = { trees: {}, rootId: null, articles: [], loadedAt: Date.now() }
  try {
    const db = useClientDb(event)
    const [rows, articles, rootId] = await Promise.all([
      db.query(
        `SELECT l.iso_code AS iso, c.id_cms_category, c.id_parent,
                COALESCE(cl.link_rewrite, clf.link_rewrite, '') AS link_rewrite, '' AS name
           FROM ps_cms_category c
           JOIN ps_lang l ON l.active = 1
      LEFT JOIN ps_cms_category_lang cl  ON cl.id_cms_category = c.id_cms_category AND cl.id_lang = l.id_lang AND cl.id_shop = 1
      LEFT JOIN ps_cms_category_lang clf ON clf.id_cms_category = c.id_cms_category AND clf.id_lang = 1 AND clf.id_shop = 1
          WHERE c.active = 1
       ORDER BY c.id_cms_category`,
      ),
      db.query(
        `SELECT c.id_cms, c.id_cms_category, l.iso_code AS iso, cl.link_rewrite
           FROM ps_cms c
           JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms
           JOIN ps_lang l ON l.id_lang = cl.id_lang AND l.active = 1
          WHERE c.active = 1 /* blog-index */`,
      ),
      loadBlogRootId(db),
    ])
    const parIso = new Map<string, any[]>()
    for (const r of rows as any[]) parIso.set(r.iso, [...(parIso.get(r.iso) ?? []), r])
    const trees: Record<string, CmsCategoryTree> = {}
    for (const [iso, lignes] of parIso) trees[iso] = buildCmsCategoryTree(lignes)
    return {
      trees,
      rootId,
      articles: (articles as any[]).map(a => ({
        id_cms: Number(a.id_cms),
        id_cms_category: Number(a.id_cms_category),
        iso: String(a.iso),
        link_rewrite: String(a.link_rewrite || ''),
      })),
      loadedAt: Date.now(),
    }
  } catch (err: any) {
    console.error('[legacy-redirects] chargement blog :', err?.message)
    return vide
  }
}

async function getBlogIndex(event: any) {
  if (blogIndex && Date.now() - blogIndex.loadedAt < CACHE_TTL_MS) return blogIndex
  if (blogLoading) return blogLoading
  blogLoading = loadBlogIndex(event).then((c) => {
    blogIndex = c
    blogLoading = null
    return c
  })
  return blogLoading
}

const BLOG_PATH_RE = /^\/(?:([a-z]{2})\/)?blog\/([^.]+?)\/?$/

function withQuery(target: string, search: string): string {
  if (!search || search === '?') return target
  const qs = search.startsWith('?') ? search.slice(1) : search
  if (!qs) return target
  return target.includes('?') ? `${target}&${qs}` : `${target}?${qs}`
}

export default defineEventHandler(async (event) => {
  
  
  
  
  
  
  const strip = event.context?._rootPrefixStrip as string | undefined
  if (strip) {
    try {
      const res = await resolveLegacy(event, new URL(strip, getRequestURL(event).origin))
      if (res !== undefined) return res
    } catch {  }
    return sendRedirect(event, strip, 301)
  }
  return resolveLegacy(event, getRequestURL(event))
})

async function resolveLegacy(event: any, url: URL) {
  const path = url.pathname

  
  if (
    path.startsWith('/_') ||
    path.startsWith('/api/') ||
    path.includes('.') && !path.endsWith('.html')
  ) {
    return
  }

  
  
  
  
  
  
  
  
  
  if (path === '/catalogsearch/result' || path === '/catalogsearch/result/') {
    const params = new URLSearchParams(url.search)
    const q = params.get('q')
    if (q !== null && q.trim() !== '') {
      params.delete('cat')
      const qs = params.toString()
      return sendRedirect(event, qs ? `/recherche?${qs}` : '/recherche', 301)
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  const clientIdForRedirect = (useRuntimeConfig(event).clientId as string | undefined) || ''
  type LegacyPrefixRule = { from: string; to: string }
  const legacyPrefixes = (((useRuntimeConfig(event).public as any)?.legacyPrefixRedirects) as LegacyPrefixRule[] | undefined) || []
  for (const rule of legacyPrefixes) {
    if (!rule?.from || !rule?.to) continue
    const from = rule.from.replace(/\/+$/, '')
    if (path === from || path.startsWith(`${from}/`)) {
      return sendRedirect(event, rule.to, 301)
    }
  }

  const c = await getCache(event)
  if (!c.available) return

  
  
  
  const allowedLocales = (((useRuntimeConfig(event).public as any)?.i18nLocales) as string[]) || []
  
  
  
  
  const rootLocale = getRootLocale(useRuntimeConfig(event).public)

  
  
  
  
  const decodedPath = safeDecode(path)
  const exact = c.byPath.get(path) ?? (decodedPath !== path ? c.byPath.get(decodedPath) : undefined)
  if (exact) {
    
    
    
    
    
    
    if (exact.id != null && (exact.kind === 'product' || exact.kind === 'category')) {
      const isoExact = localeOfPath(path, allowedLocales, rootLocale)
      let honest: string | null | undefined
      try {
        honest = await retiredEntityTarget(
          event, useClientDb(event), exact.kind as 'product' | 'category', exact.id, isoExact, allowedLocales,
        )
      } catch { honest = undefined }
      
      
      
      
      
      
      
      
      if (honest !== undefined && exact.kind === 'product') {
        const mTarget = safeDecode(exact.target).match(TRAILING_ID_RE)
        const tid = mTarget ? Number(mTarget[2]) : 0
        if (tid && tid !== exact.id) {
          let live = false
          try {
            const row: { active: number } | null = await useClientDb(event).get(
              `SELECT p.active AS active FROM ps_product p WHERE p.id_product = ? LIMIT 1`,
              [tid],
            )
            live = !!row && Number(row.active) === 1
          } catch { live = false }
          if (live) return sendRedirect(event, withQuery(exact.target, url.search), exact.code)
        }
      }
      if (honest === null) gone()
      if (honest && honest !== path) {
        return sendRedirect(event, withQuery(honest, url.search), exact.code)
      }
      
      
      
      
      
      
      
      if (honest === undefined) {
        let canonical: string | null = null
        try {
          canonical = await canonicalUrlForLang(
            event, useClientDb(event), exact.kind as 'product' | 'category', exact.id, isoExact, allowedLocales,
          )
        } catch { canonical = null }
        if (canonical && sameRoute(canonical, decodedPath)) return
      }
    } else {
      
      
      
      
      
      
      
      const isoLoose = localeOfPath(path, allowedLocales, rootLocale)
      const mLive = decodedPath.match(TRAILING_ID_RE)
      if (mLive) {
        try {
          const db = useClientDb(event)
          const pid = Number(mLive[2])
          const row: { active: number } | null = await db.get(
            `SELECT p.active AS active FROM ps_product p WHERE p.id_product = ? LIMIT 1`,
            [pid],
          )
          if (row && Number(row.active) === 1) {
            const canonical = await canonicalUrlForLang(event, db, 'product', pid, isoLoose, allowedLocales)
            if (canonical && sameRoute(canonical, decodedPath)) return
          }
        } catch {  }
      }
      try {
        const roots = await getRootCache(event)
        if (roots.available && isLiveCategoryPath(decodedPath, allowedLocales, roots.live, roots.tree, rootLocale)) return
      } catch {  }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const mHop = exact.target.match(/^\/produit\/(\d+)$/)
    if (mHop) {
      const langHop = (path.match(/^\/([a-z]{2})\//) || [])[1]
      
      
      
      
      
      let direct: string | null = null
      try {
        direct = await canonicalUrlForLang(
          event, useClientDb(event), 'product', Number(mHop[1]), langHop, allowedLocales,
        )
      } catch { direct = null }
      
      
      if (direct && direct !== path) {
        return sendRedirect(event, withQuery(direct, url.search), exact.code)
      }
    }
    return sendRedirect(event, withQuery(exact.target, url.search), exact.code)
  }

  
  const mProd = path.match(PRODUCT_RE)
  if (mProd) {
    const lang = mProd[1]
    const pid = Number(mProd[2])
    const hit = pickById(c.byProductId, pid, lang || rootLocale)
    if (hit) {
      
      
      
      
      
      let honest: string | null | undefined
      try {
        honest = await retiredEntityTarget(event, useClientDb(event), 'product', pid, lang, allowedLocales)
      } catch { honest = undefined }
      if (honest === null) gone()
      if (honest && honest !== path) {
        return sendRedirect(event, withQuery(honest, url.search), hit.code)
      }

      
      
      
      
      
      
      
      
      
      if (lang && lang !== rootLocale) {
        try {
          const resolved = await canonicalUrlForLang(
            event, useClientDb(event), 'product', pid, lang, allowedLocales,
          )
          if (resolved && resolved !== path) {
            return sendRedirect(event, withQuery(resolved, url.search), hit.code)
          }
        } catch {
          
        }
      }
      
      
      const mIntermediate = hit.target.match(PRODUIT_ID_RE)
      if (mIntermediate && clientIdForRedirect) {
        try {
          const canonicalUrl = await canonicalUrlForLang(
            event, useClientDb(event), 'product', Number(mIntermediate[2]),
            lang || mIntermediate[1], allowedLocales,
          )
          if (canonicalUrl && canonicalUrl !== hit.target && canonicalUrl !== path) {
            return sendRedirect(event, withQuery(canonicalUrl, url.search), hit.code)
          }
        } catch {
          
        }
      }
      const target = localizeTarget(hit.target, lang, allowedLocales)
      if (target) return sendRedirect(event, withQuery(target, url.search), hit.code)
    } else {
      
      
      
      let honest: string | null | undefined
      let deleted = false
      try {
        const db = useClientDb(event)
        honest = await retiredEntityTarget(event, db, 'product', pid, lang, allowedLocales)
        if (honest === undefined) deleted = await isDeletedProductId(db, pid)
      } catch { honest = undefined }
      if (honest === null || deleted) gone()
      if (honest && honest !== path) {
        return sendRedirect(event, withQuery(honest, url.search), 301)
      }
    }
  }

  
  const mCat = path.match(CATEGORY_RE)
  if (mCat) {
    const lang = mCat[1]
    const catId = Number(mCat[2])
    const hit = pickById(c.byCatId, catId, lang || rootLocale)
    if (hit) {
      
      
      
      
      
      let honest: string | null | undefined
      try {
        honest = await retiredEntityTarget(event, useClientDb(event), 'category', catId, lang, allowedLocales)
      } catch { honest = undefined }
      if (honest === null) gone()
      if (honest && honest !== path) {
        return sendRedirect(event, withQuery(honest, url.search), hit.code)
      }

      
      
      
      if (lang && lang !== rootLocale) {
        try {
          const resolved = await canonicalUrlForLang(
            event, useClientDb(event), 'category', catId, lang, allowedLocales,
          )
          if (resolved && resolved !== path) {
            return sendRedirect(event, withQuery(resolved, url.search), hit.code)
          }
        } catch {
          
        }
      }
      const target = localizeTarget(hit.target, lang, allowedLocales)
      if (target) return sendRedirect(event, withQuery(target, url.search), hit.code)
    }
  }

  
  
  
  
  
  
  
  
  
  
  const productIdCanonical = !!((useRuntimeConfig(event).public as any)?.productIdCanonicalRedirect)
  const mProduit = path.match(PRODUIT_ID_RE)
  if (mProduit && productIdCanonical) {
    const lang = mProduit[1]
    const pid = Number(mProduit[2])
    
    
    
    
    
    let honest: string | null | undefined
    try {
      honest = await retiredEntityTarget(event, useClientDb(event), 'product', pid, lang, allowedLocales)
    } catch { honest = undefined }
    if (honest === null) gone()
    if (honest && honest !== path) {
      return sendRedirect(event, withQuery(honest, url.search), 301)
    }
    try {
      const db = useClientDb(event)
      const rows = await db.query<{ link_rewrite: string; id_category_default: number }>(
        `SELECT pl.link_rewrite, p.id_category_default
           FROM ps_product p
           JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
          WHERE p.id_product = ? AND p.active = 1
          LIMIT 1`,
        [pid],
      )
      if (rows.length) {
        
        
        
        
        
        const canonical = await canonicalUrlForLang(event, db, 'product', pid, lang, allowedLocales)
        if (canonical && canonical !== path) {
          return sendRedirect(event, withQuery(canonical, url.search), 301)
        }
      }
    } catch {
      
    }
  }

  
  
  
  
  const mBlog = path.match(BLOG_LEGACY_RE)
  if (mBlog) {
    const lang = mBlog[1]
    const cmsId = Number(mBlog[2])
    try {
      const db = useClientDb(event)
      
      let idLang = 1
      if (lang && lang !== rootLocale) {
        const langRow = await db.get<{ id_lang: number }>(
          `SELECT id_lang FROM ps_lang WHERE iso_code = ? AND active = 1 LIMIT 1`,
          [lang],
        ).catch(() => null)
        if (langRow?.id_lang) idLang = langRow.id_lang
      }
      const row = await db.get<{ link_rewrite: string }>(
        `SELECT link_rewrite FROM ps_cms_lang
          WHERE id_cms = ? AND id_lang = ? LIMIT 1`,
        [cmsId, idLang],
      ).catch(() => null)
      
      
      const linkRewrite = row?.link_rewrite || (
        idLang !== 1
          ? (await db.get<{ link_rewrite: string }>(
              `SELECT link_rewrite FROM ps_cms_lang WHERE id_cms = ? AND id_lang = 1 LIMIT 1`,
              [cmsId],
            ).catch(() => null))?.link_rewrite
          : null
      )
      if (linkRewrite) {
        const nuxtUrl = `/blog/${linkRewrite.split('--').join('/')}`
        const localized = localizeTarget(nuxtUrl, lang, allowedLocales)
        if (localized && localized !== path) return sendRedirect(event, withQuery(localized, url.search), 301)
      }
      
      
      
      if (!row && await isDeletedCmsId(db, cmsId)) gone()
    } catch (err: any) {
      if (err?.statusCode === 410) throw err
      
    }
  }

  
  
  
  
  
  
  
  
  
  
  const mCms = path.match(LEGACY_CMS_RE)
  if (mCms) {
    const lang = mCms[1]
    const raw = safeDecode(mCms[2])
    
    
    const candidates = [raw, raw.replace(/^\d+-/, '')].filter((s, i, a) => s && a.indexOf(s) === i)
    const roots = await getRootCache(event)
    for (const slug of candidates) {
      if (slug.includes('--')) continue
      const renamed = c.byPath.get(`/${slug}`)
      if (renamed) {
        const target = localizeTarget(renamed.target, lang, allowedLocales)
        if (target && target !== path) return sendRedirect(event, withQuery(target, url.search), renamed.code)
      }
      if (roots.cmsSlugs.has(slug)) {
        const target = localizeTarget(`/${slug}`, lang, allowedLocales)
        if (target && target !== path) return sendRedirect(event, withQuery(target, url.search), 301)
      }
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  {
    const segs = path.split('/').filter(Boolean)
    let lang: string | undefined
    if (segs.length > 1 && segs[0] !== rootLocale && allowedLocales.includes(segs[0])) lang = segs.shift()
    const mPs17 = segs.length >= 1 && segs.length <= 2 ? safeDecode(segs[segs.length - 1]).match(PS17_PRODUCT_SEG_RE) : null
    if (mPs17) {
      const pid = Number(mPs17[1])
      const rewrite = mPs17[2]
      try {
        const db = useClientDb(event)
        const proven = await db.get(
          `SELECT p.id_product AS proven_id
             FROM ps_product p
            WHERE p.id_product = ? AND p.active = 1
              AND EXISTS (SELECT 1 FROM ps_product_lang pl
                           WHERE pl.id_product = p.id_product AND pl.link_rewrite = ?)
            LIMIT 1`,
          [pid, rewrite],
        )
        if (proven) {
          const canonical = await canonicalUrlForLang(event, db, 'product', pid, lang, allowedLocales)
          
          
          
          
          if (canonical && canonical !== path
            && segmentCount(canonical, allowedLocales, rootLocale) >= MIN_TARGET_SEGMENTS) {
            return sendRedirect(event, withQuery(canonical, url.search), 301)
          }
        }
      } catch {
        
      }
    }
  }

  
  
  
  
  
  
  if (!PRODUCT_RE.test(path) && !CATEGORY_RE.test(path)) {
    const mTrail = path.match(TRAILING_ID_RE)
    if (mTrail) {
      const lang = mTrail[1]
      const pid = Number(mTrail[2])
      const stripped = lang ? path.slice(lang.length + 1) : path
      const firstSeg = stripped.slice(1).split('/')[0]
      const roots = await getRootCache(event)

      
      
      
      
      
      
      
      
      
      
      
      const segsAfterLang = stripped.split('/').filter(Boolean)
      const bareProductSlug = segsAfterLang.length === 1
      
      
      
      
      const isCmsSlug = roots.cmsSlugs.has(firstSeg)
      const rootKnown = roots.available
        && !isCmsSlug
        && (Boolean(roots.live[firstSeg]) || Boolean(roots.aliases[firstSeg]) || bareProductSlug)

      
      
      
      
      
      
      
      
      const isCategory = roots.available
        && (isLiveCategoryPath(path, allowedLocales, roots.live, roots.tree, rootLocale)
          || isLiveCategoryPath(path, allowedLocales, roots.live, roots.knownTree, rootLocale))

      if (rootKnown && !isCategory) {
        try {
          const db = useClientDb(event)
          const rows = await db.query<{ link_rewrite: string; id_category_default: number }>(
            `SELECT pl.link_rewrite, p.id_category_default
               FROM ps_product p
               JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
              WHERE p.id_product = ? AND p.active = 1
              LIMIT 1`,
            [pid],
          )
          if (rows.length) {
            
            
            
            const canonical = await canonicalUrlForLang(event, db, 'product', pid, lang, allowedLocales)
            
            if (canonical && canonical !== path) {
              return sendRedirect(event, withQuery(canonical, url.search), 301)
            }
          }
        } catch {
          
        }

        
        
        
        
        let honest: string | null | undefined
        try {
          const db = useClientDb(event)
          const last = stripped.split('/').filter(Boolean).pop() || ''
          const rewrite = safeDecode(last).replace(/-\d+$/, '')
          const retired = await db.get(
            `SELECT p.id_product AS retired_id
               FROM ps_product p
              WHERE p.id_product = ? AND p.active = 0
                AND EXISTS (SELECT 1 FROM ps_product_lang pl
                             WHERE pl.id_product = p.id_product AND pl.link_rewrite = ?)
              LIMIT 1`,
            [pid, rewrite],
          )
          if (retired) honest = await retiredEntityTarget(event, db, 'product', pid, lang, allowedLocales)
        } catch { honest = undefined }
        if (honest === null) gone()
        if (honest && honest !== path) {
          return sendRedirect(event, withQuery(honest, url.search), 301)
        }
      }
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  if (!PRODUCT_RE.test(path) && !CATEGORY_RE.test(path) && !TRAILING_ID_RE.test(path)) {
    const mBare = path.match(LEGACY_HTML_SLUG_RE) ?? path.match(BARE_PRODUCT_SLUG_RE)
    if (mBare) {
      const lang = mBare[1]
      const slug = mBare[2]
      
      
      const slugPath = lang ? `/${lang}/${slug}` : `/${slug}`
      const roots = await getRootCache(event)

      
      const isCmsSlug = roots.cmsSlugs.has(slug)

      
      
      
      
      
      const isCategory = roots.available
        && isLiveCategoryPath(slugPath, allowedLocales, roots.live, roots.tree, rootLocale)

      if (roots.available && !isCmsSlug && !isCategory) {
        try {
          const db = useClientDb(event)
          const { idLangFromIso } = await import('~/server/utils/lang')
          const idLang = await idLangFromIso(event, lang || 'fr')
          const row = await db.get<{ id_product: number }>(
            `SELECT p.id_product
               FROM ps_product p
               JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
              WHERE pl.link_rewrite = ? AND p.active = 1
              LIMIT 1`,
            [idLang, slug],
          )
          if (row?.id_product) {
            
            
            const canonical = await canonicalUrlForLang(event, db, 'product', row.id_product, lang, allowedLocales)
            if (canonical && canonical !== path) {
              return sendRedirect(event, withQuery(canonical, url.search), 301)
            }
          }
        } catch {
          
        }

        
        
        
        if (LEGACY_HTML_SLUG_RE.test(path)) {
          let honest: string | null | undefined
          try {
            const db = useClientDb(event)
            const { idLangFromIso } = await import('~/server/utils/lang')
            const idLang = await idLangFromIso(event, lang || 'fr')
            const retired: { retired_id: number } | null = await db.get(
              `SELECT p.id_product AS retired_id
                 FROM ps_product p
                 JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
                WHERE pl.link_rewrite = ? AND p.active = 0
                LIMIT 1`,
              [idLang, slug],
            )
            if (retired?.retired_id) {
              honest = await retiredEntityTarget(event, db, 'product', Number(retired.retired_id), lang, allowedLocales)
            }
          } catch { honest = undefined }
          if (honest === null) gone()
          if (honest && honest !== path) {
            return sendRedirect(event, withQuery(honest, url.search), 301)
          }
        }
      }
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const mBlogPath = path.match(BLOG_PATH_RE)
  if (mBlogPath) {
    const iso = mBlogPath[1] && allowedLocales.includes(mBlogPath[1]) ? mBlogPath[1] : (mBlogPath[1] ? '' : rootLocale)
    if (iso) {
      const idx = await getBlogIndex(event)
      const cible = resolveLegacyBlogPath(safeDecode(mBlogPath[2]).split('/'), idx, iso, PIVOT_LOCALE)
      if (cible) {
        const prefixe = iso === rootLocale ? '' : `/${iso}`
        const chemin = cible.inner
          ? `${prefixe}/blog/${cible.inner}${cible.article ? '' : '/'}`
          : `${prefixe}/blog/`
        if (!sameRoute(chemin, path)) return sendRedirect(event, withQuery(chemin, url.search), 301)
      }
    }
    return
  }

  const rootsCache = await getRootCache(event)
  if (rootsCache.available) {
    const resolved = resolveFullPath(
      path, allowedLocales, rootsCache.live, rootsCache.aliases, rootsCache.tree,
      
      
      
      rootLocale,
      
      
      { knownCategory: isLiveCategoryPath(path, allowedLocales, rootsCache.live, rootsCache.knownTree, rootLocale) },
    )
    if (resolved && resolved.path !== path) {
      return sendRedirect(event, withQuery(resolved.path, url.search), 301)
    }

    
    
    
    
    
    
    
    if (!resolved
      && isLiveCategoryPath(path, allowedLocales, rootsCache.live, rootsCache.knownTree, rootLocale)
      && !isLiveCategoryPath(path, allowedLocales, rootsCache.live, rootsCache.tree, rootLocale)) {
      gone()
    }
  }
}
