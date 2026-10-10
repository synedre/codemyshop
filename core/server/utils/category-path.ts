

import type { ResolvedPilier } from './tenant-piliers'
import { invalidateCategoryTreeMemos } from './memo-ttl'

export interface CategoryPathInfo {
  
  path: string
  

  pilier: string | null
}

const PATH_MAP_TTL = 60 * 1000
const pathMapCache = new Map<string, { map: Map<number, CategoryPathInfo>; ts: number }>()

export function invalidateCategoryPathCache(): void {
  pathMapCache.clear()
  invalidateCategoryTreeMemos()
}

export async function buildCategoryPathMap(
  db: any,
  ids: number[],
  idLang: number,
  piliersConfig: ResolvedPilier[],
): Promise<Map<number, CategoryPathInfo>> {
  if (!ids.length) return new Map()

  
  
  
  const piliersKey = piliersConfig.map(p => `${p.idCategory}:${p.slug}`).join(',')
  const cacheKey = `${db.clientId}:${idLang}:${piliersKey}`
  const now = Date.now()
  const hit = pathMapCache.get(cacheKey)
  if (hit && now - hit.ts < PATH_MAP_TTL) {
    return hit.map
  }

  
  
  
  
  
  
  
  const rows = await db.query<{ id_category: number; id_parent: number; active: number; link_rewrite: string }>(
    `SELECT c.id_category, c.id_parent, c.active,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1`,
    [idLang],
  )
  const byId = new Map<number, { id_parent: number; link_rewrite: string; active: boolean }>()
  for (const r of rows) byId.set(r.id_category, { id_parent: r.id_parent, link_rewrite: r.link_rewrite, active: Number(r.active) === 1 })

  const pilierById = new Map<number, ResolvedPilier>()
  for (const p of piliersConfig) pilierById.set(p.idCategory, p)
  const cache = new Map<number, CategoryPathInfo>()

  const resolve = (id: number): CategoryPathInfo => {
    if (cache.has(id)) return cache.get(id)!

    
    if (pilierById.has(id)) {
      const v: CategoryPathInfo = { path: '', pilier: pilierById.get(id)!.slug }
      cache.set(id, v); return v
    }
    if (!byId.has(id)) { const v = { path: '', pilier: null as any }; cache.set(id, v); return v }

    
    
    
    
    
    
    const chainLeafFirst: string[] = []
    let cursor: number | null = id
    const guard = new Set<number>()
    let pilierMatch: ResolvedPilier | null = null
    while (cursor && !guard.has(cursor) && cursor > 2) {
      guard.add(cursor)
      if (pilierById.has(cursor)) { pilierMatch = pilierById.get(cursor)!; break }
      const row = byId.get(cursor)
      if (!row) break
      
      
      if (row.active && row.link_rewrite) chainLeafFirst.push(row.link_rewrite)
      cursor = row.id_parent
    }
    
    const segments = chainLeafFirst.slice().reverse()
    const info: CategoryPathInfo = {
      path: segments.join('/'),
      pilier: pilierMatch?.slug ?? null,
    }
    cache.set(id, info)
    return info
  }

  
  
  
  
  const out = new Map<number, CategoryPathInfo>()
  for (const id of byId.keys()) out.set(id, resolve(id))
  pathMapCache.set(cacheKey, { map: out, ts: now })
  return out
}

export function buildProductUrlFromCategory(
  idCategoryDefault: number,
  slug: string,
  pathMap: Map<number, CategoryPathInfo>,
  opts: {
    langPrefix: string
    prefixesByPilier?: Record<string, string>
    noPilier?: boolean
    productId?: number
  },
): string {
  const info = pathMap.get(idCategoryDefault)
  const slugFinal = opts.productId && opts.productId > 0 ? `${slug}-${opts.productId}` : slug

  
  if (opts.noPilier || (info && info.pilier === null && info.path)) {
    return info?.path
      ? `${opts.langPrefix}/${info.path}/${slugFinal}`
      : `${opts.langPrefix}/${slugFinal}`
  }
  
  const pilierSlug = info?.pilier ?? null
  const prefix = (pilierSlug && opts.prefixesByPilier?.[pilierSlug]) ?? pilierSlug ?? ''
  if (!prefix) {
    
    return info?.path
      ? `${opts.langPrefix}/${info.path}/${slugFinal}`
      : `${opts.langPrefix}/${slugFinal}`
  }
  return info?.path
    ? `${opts.langPrefix}/${prefix}/${info.path}/${slugFinal}`
    : `${opts.langPrefix}/${prefix}/${slugFinal}`
}
