

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { createCategoryTreeMemo } from './memo-ttl'
import { loadCategoryRoots } from './category-roots'

export async function loadSiloSlugMapForLang(idLang: number): Promise<Map<string, string>> {
  if (idLang === 1) return new Map()  
  
  
  
  
  return siloSlugMapMemo.get(String(idLang), () => buildSiloSlugMap(idLang))
}

const siloSlugMapMemo = createCategoryTreeMemo<Map<string, string>>(60 * 1000)

export interface SiloCategoryRow {
  id_category: number
  id_parent: number
  slug_fr: string
  slug_lang: string
}

async function buildSiloSlugMap(idLang: number): Promise<Map<string, string>> {
  try {
    const roots = await loadCategoryRoots()
    if (!roots.length) return new Map()
    
    const result = await usePocPg().execute(sql`
      SELECT c.id_category, c.id_parent,
             COALESCE(clf.link_rewrite, '') AS slug_fr,
             COALESCE(cl.link_rewrite, clf.link_rewrite, '') AS slug_lang
        FROM cs_main.ps_category c
   LEFT JOIN cs_main.ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ${idLang} AND cl.id_shop = 1
   LEFT JOIN cs_main.ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
       WHERE c.active = 1
    `)
    return slugMapFromRows(result as unknown as SiloCategoryRow[], roots.map(r => r.id))
  } catch { return new Map()  }
}

export function slugMapFromRows(rows: SiloCategoryRow[], rootIds: number[]): Map<string, string> {
  const map = new Map<string, string>()
  const roots = new Set(rootIds)
  const byId = new Map<number, { id_parent: number; slug_fr: string; slug_lang: string }>()
  for (const r of rows) {
    byId.set(Number(r.id_category), {
      id_parent: Number(r.id_parent),
      slug_fr: r.slug_fr,
      slug_lang: r.slug_lang || r.slug_fr,
    })
  }

  
  const pathCache = new Map<number, string>()
  const pathFr = (id: number, guard = new Set<number>()): string => {
    if (pathCache.has(id)) return pathCache.get(id)!
    const row = byId.get(id)
    let p = ''
    if (row && !guard.has(id)) {
      guard.add(id)
      if (roots.has(id)) p = row.slug_fr
      else {
        const parent = pathFr(row.id_parent, guard)
        p = parent && row.slug_fr ? `${parent}/${row.slug_fr}` : ''
      }
    }
    pathCache.set(id, p)
    return p
  }

  for (const [id, row] of byId) {
    const p = pathFr(id)
    if (p) map.set(p, roots.has(id) ? row.slug_fr : row.slug_lang)
  }
  return map
}

export function localizeSiloHref(
  href: string | null | undefined,
  slugMap: Map<string, string>,
): string | null {
  if (!href || typeof href !== 'string') return href ?? null
  if (slugMap.size === 0) return href

  
  if (/^(https?:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('?')) return href

  
  const clean = href.replace(/^\/+/, '').replace(/\/+$/, '')
  const segs = clean.split('/')
  if (segs.length < 2) return href
  const root = segs[0]
  
  if (!slugMap.has(root)) return href

  const innerSegs = segs.slice(1)
  
  
  const out: string[] = []
  for (let i = 0; i < innerSegs.length; i++) {
    const partialMaster = [root, ...innerSegs.slice(0, i + 1)].join('/')
    const leafLang = slugMap.get(partialMaster)
    out.push(leafLang || innerSegs[i])
  }

  const trailing = href.endsWith('/') ? '/' : ''
  const leading = href.startsWith('/') ? '/' : ''
  return `${leading}${root}/${out.join('/')}${trailing}`
}
