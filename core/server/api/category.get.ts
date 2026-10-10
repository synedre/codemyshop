

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'
import { getCategoryAggMap, computeCategoryAggLive } from '~/server/utils/category-agg'
import { isEntityTierClosed } from '~/server/utils/index-tier'
import { loadCategoryTiles, type CategoryTileItem } from '~/server/utils/category-tiles'
import { loadCategoryCoverIndex } from '~/server/utils/ps-fs'
import { chooseCategoryImage, needsInheritedImage, type InheritedHeroImage } from '~/utils/category-hero-image'
import { buildCategoryCoverUrls, type CategoryCoverIndex } from '~/server/utils/category-cover-urls'
import { visibiliteSql } from '~/utils/product-visibility'

interface CategoryChild {
  id: number
  slug: string
  path: string
  label: string
  

  pilier?: string
}

interface CategoryGuideLink {
  label: string
  url: string
}

interface CategoryFaqItem {
  position: number
  question: string
  answer_html: string
}

interface CategoryAggregate {
  total: number
  

  total_in_stock: number | null
  price_min: number | null
  price_max: number | null
  

  known?: boolean
}

export interface CategoryResponse {
  found: boolean
  kind: 'pilier' | 'category'
  pilier: string
  id_category: number | null
  id_parent: number | null
  level_depth: number
  path: string
  

  path_fr: string
  
  pilier_slug_fr: string
  

  pilier_slug: string
  slug: string
  name: string
  h1: string
  meta_title: string
  meta_description: string
  intro_html: string | null
  long_description_html: string | null
  
  image_url: string | null
  
  image_webp_srcset: string | null
  
  image_sizes: string | null
  
  image_alt?: string | null
  breadcrumb: Array<{ label: string; path: string }>
  children: CategoryChild[]
  

  sidebar_children?: CategoryChild[]
  

  siblings?: CategoryChild[]
  aggregate: CategoryAggregate
  faq: CategoryFaqItem[]
  

  tiles: CategoryTileItem[]
  

  guide_link?: CategoryGuideLink | null
}

const COVER_WIDTHS = [400, 600, 800, 1200] as const

function slugifyForFilename(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category'
}

async function getMasterSlug(db: any, idCategory: number): Promise<string> {
  
  
  const row = await db.get<{ link_rewrite: string }>(
    'SELECT link_rewrite FROM ps_category_lang WHERE id_category = ? AND id_lang = 1 AND id_shop = 1 LIMIT 1',
    [idCategory],
  )
  return slugifyForFilename(row?.link_rewrite || `cat-${idCategory}`)
}

function buildImageUrls(
  id: number,
  masterSlug: string,
  coverIndex: CategoryCoverIndex,
): { url: string | null; srcset: string | null; sizes: string | null } {
  const { url, srcset } = buildCategoryCoverUrls(id, masterSlug, coverIndex, COVER_WIDTHS)
  if (!url && !srcset) return { url: null, srcset: null, sizes: null }
  return {
    url: url || null,
    srcset: srcset || null,
    
    sizes: '(min-width: 768px) 33vw, 100vw',
  }
}

const pilierCache = new Map<string, { id: number; level_depth: number; id_parent: number } | null>()

async function resolvePilier(db: any, slug: string, idLang: number = 1): Promise<{ id: number; level_depth: number; id_parent: number } | null> {
  if (!slug) return null
  const cacheKey = `${idLang}::${slug}`
  if (pilierCache.has(cacheKey)) return pilierCache.get(cacheKey)!
  
  
  
  const row = await db.get<{ id_category: number; level_depth: number; id_parent: number }>(
    `SELECT c.id_category, c.level_depth, c.id_parent
       FROM ps_category c
       JOIN ps_category_lang cl ON cl.id_category = c.id_category
         AND cl.id_lang IN (?, 1) AND cl.id_shop = 1
      WHERE cl.link_rewrite = ? AND c.active = 1
      ORDER BY (CASE WHEN cl.id_lang = ? THEN 0 ELSE 1 END) ASC,
               c.level_depth ASC, c.id_category ASC
      LIMIT 1`,
    [idLang, slug, idLang],
  )
  const result = row ? { id: row.id_category, level_depth: row.level_depth, id_parent: row.id_parent } : null
  pilierCache.set(cacheKey, result)
  return result
}

interface CategoryRow {
  id_category: number
  id_parent: number
  level_depth: number
  name: string
  link_rewrite: string
  description: string | null
  additional_description: string | null
  meta_title: string | null
  meta_description: string | null
}

async function loadSidebarDescendants(
  db: any,
  parentRows: CategoryRow[],
  basePath: string,
  idLang: number,
  opts: { manufacturersOnly?: boolean } = {},
): Promise<CategoryChild[]> {
  if (parentRows.length === 0) return []
  const placeholders = parentRows.map(() => '?').join(', ')
  
  
  
  
  
  const manufacturerSql = opts.manufacturersOnly
    ? `AND EXISTS (SELECT 1 FROM ps_manufacturer m
                    WHERE m.active = 1
                      AND lower(trim(m.name)) = lower(trim(COALESCE(cl.name, clf.name, ''))))`
    : ''
  const orderSql = opts.manufacturersOnly
    ? `(SELECT COUNT(*) FROM ps_category_product cpv WHERE cpv.id_category = c.id_category) DESC, c.id_category ASC`
    : 'c.id_parent ASC, c.position ASC, c.id_category ASC'
  const descendantRows = await db.query<CategoryRow>(
    `SELECT c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            cl.additional_description AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_parent IN (${placeholders}) AND c.active = 1
        ${manufacturerSql}
      ORDER BY ${orderSql}`,
    [idLang, ...parentRows.map(row => row.id_category)],
  )
  const parentById = new Map(parentRows.map(row => [row.id_category, row]))
  const seenLabels = new Set<string>()
  const items = descendantRows.flatMap(row => {
    const parent = parentById.get(row.id_parent)
    const key = row.name.trim().toLocaleLowerCase()
    if (!parent || !key || seenLabels.has(key)) return []
    seenLabels.add(key)
    return [{
      id: row.id_category,
      slug: row.link_rewrite,
      path: [basePath, parent.link_rewrite, row.link_rewrite].filter(Boolean).join('/'),
      label: row.name,
    }]
  })
  return opts.manufacturersOnly
    ? items.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }))
    : items
}

function sidebarManufacturerCategoryIds(event: any): Set<number> {
  const raw = useRuntimeConfig(event).public.categorySidebarManufacturerCategoryIds
  return new Set(Array.isArray(raw) ? raw.map(Number).filter(Number.isInteger) : [])
}

async function walkSegments(
  db: any,
  segments: string[],
  pilierId: number,
  idLang: number,
): Promise<CategoryRow | null> {
  let currentParent = pilierId
  let lastRow: CategoryRow | null = null

  for (const seg of segments) {
    const row = await db.get<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              cl.additional_description AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)         AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1
          AND (cl.link_rewrite = ? OR clf.link_rewrite = ?)
        LIMIT 1`,
      [idLang, currentParent, seg, seg],
    )
    if (!row) return null
    currentParent = row.id_category
    lastRow = row
  }
  return lastRow
}

async function getCustomH1(_db: any, idCategory: number, idLang: number, event?: any): Promise<string | null> {
  try {
    const { getCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getCategoryH1(idCategory, idLang, { event })
  } catch (e: any) {
    console.error('[category] custom H1 error:', e?.message)
    return null
  }
}

async function getImageAlt(idCategory: number, idLang: number, event?: any): Promise<string | null> {
  try {
    const { getCategoryImageAlt } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getCategoryImageAlt(idCategory, idLang, { event })
  } catch (e: any) {
    console.error('[category] image alt error:', e?.message)
    return null
  }
}

async function getGuideLink(idCategory: number, idLang: number, event?: any): Promise<CategoryGuideLink | null> {
  try {
    const { getCategoryGuideLink } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getCategoryGuideLink(idCategory, idLang, { event })
  } catch (e: any) {
    console.error('[category] guide link error:', e?.message)
    return null
  }
}

async function getHeroImageUrl(idCategory: number, event?: any): Promise<string | null> {
  try {
    const { getCategoryHeroImageUrl } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getCategoryHeroImageUrl(idCategory, { event })
  } catch (e: any) {
    console.error('[category] hero image error:', e?.message)
    return null
  }
}

async function getInheritedHeroImage(db: any, idCategory: number, idLang: number, event?: any): Promise<InheritedHeroImage | null> {
  try {
    const rows = await db.query<{ id_category: number }>(
      `WITH RECURSIVE anc(id_category, id_parent, depth) AS (
         SELECT id_category, id_parent, 0 FROM ps_category WHERE id_category = ?
         UNION ALL
         SELECT c.id_category, c.id_parent, a.depth + 1
           FROM ps_category c JOIN anc a ON c.id_category = a.id_parent
          WHERE a.depth < 20 AND a.id_parent <> a.id_category
       )
       SELECT id_category FROM anc WHERE depth > 0 ORDER BY depth`,
      [idCategory],
    )
    const ids = rows.map((r: { id_category: number }) => Number(r.id_category))
    const { getNearestAncestorHeroImage } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getNearestAncestorHeroImage(ids, idLang, { event })
  } catch (e: any) {
    console.error('[category] inherited hero image error:', e?.message)
    return null
  }
}

async function loadAncestorsFr(
  db: any,
  idCategory: number,
  pilierId: number,
): Promise<string[]> {
  const chain: string[] = []
  let cursor: number | null = idCategory
  const guard = new Set<number>()
  while (cursor && cursor !== pilierId && !guard.has(cursor)) {
    guard.add(cursor)
    const row = await db.get<{ id_category: number; id_parent: number; link_rewrite: string }>(
      `SELECT c.id_category, c.id_parent, cl.link_rewrite
         FROM ps_category c
    LEFT JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [cursor],
    )
    if (!row) break
    chain.unshift(row.link_rewrite || `cat-${row.id_category}`)
    cursor = row.id_parent
  }
  return chain
}

async function loadAncestors(
  db: any,
  idCategory: number,
  pilierId: number,
  idLang: number,
): Promise<Array<{ id: number; name: string; link_rewrite: string }>> {
  const chain: Array<{ id: number; name: string; link_rewrite: string }> = []
  let cursor: number | null = idCategory
  const guard = new Set<number>()
  while (cursor && cursor !== pilierId && !guard.has(cursor)) {
    guard.add(cursor)
    const row = await db.get<{ id_category: number; id_parent: number; name: string; link_rewrite: string }>(
      `SELECT c.id_category, c.id_parent,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [idLang, cursor],
    )
    if (!row) break
    chain.unshift({ id: row.id_category, name: row.name, link_rewrite: row.link_rewrite })
    cursor = row.id_parent
  }
  return chain
}

export default defineCachedEventHandler(async (event): Promise<CategoryResponse> => {
  const idLang = await resolveIdLang(event)
  const query = getQuery(event)

  const pilierKey = String(query.pilier ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!pilierKey) {
    throw createError({ statusCode: 400, message: 'pilier manquant' })
  }

  const db = useClientDb(event)
  const pilierRow = await resolvePilier(db, pilierKey, idLang)
  if (!pilierRow) {
    throw createError({ statusCode: 404, message: `pilier introuvable : ${pilierKey}` })
  }
  const pilier = { id: pilierRow.id }

  const rawPath = String(query.path ?? '').trim().replace(/^\/+|\/+$/g, '')
  const segments = rawPath ? rawPath.split('/').filter(Boolean) : []

  if (segments.length > 4) {
    throw createError({ statusCode: 400, message: 'Profondeur URL > 4 niveaux' })
  }
  for (const seg of segments) {
    if (!/^[a-z0-9-]+$/.test(seg)) {
      throw createError({ statusCode: 400, message: `Slug invalide : ${seg}` })
    }
  }

  
  

  
  if (segments.length === 0) {
    
    
    
    
    const rows = await db.query<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              cl.additional_description AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1
          AND (
            c.id_category IN (390, 391, 392)
            OR EXISTS (
              SELECT 1 FROM ps_product p
              JOIN ps_category_product cp ON cp.id_product = p.id_product
              JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
              WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
            )
          )
        ORDER BY c.position ASC`,
      [idLang, pilier.id],
    )
    const pilierSidebarChildren = useRuntimeConfig(event).public.categorySidebarDescendantItems === true
      ? await loadSidebarDescendants(db, rows, '', idLang, {
          manufacturersOnly: sidebarManufacturerCategoryIds(event).has(Number(pilier.id)),
        })
      : []

    
    const pilierMeta = await db.get<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              cl.additional_description AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [idLang, pilier.id],
    )

    const pilierCustomH1 = await getCustomH1(db, pilier.id, idLang, event)
    const pilierImages = buildImageUrls(pilier.id, await getMasterSlug(db, pilier.id), loadCategoryCoverIndex(event))
    
    const pilierHeroUrl = await getHeroImageUrl(pilier.id, event)
    const pilierLabel = pilierMeta?.name || pilierKey

    
    
    
    let pilierAgg: CategoryAggregate = { total: 0, total_in_stock: null, price_min: null, price_max: null }
    try {
      
      
      
      const cachedAgg = (await getCategoryAggMap(db, [pilier.id])).get(pilier.id)
      const live = cachedAgg ?? (await computeCategoryAggLive(db, pilier.id))
      if (live) pilierAgg = {
        total: live.total,
        total_in_stock: live.totalInStock,
        price_min: live.priceMin,
        price_max: live.priceMax,
        known: true,
      }
    } catch (e: any) {
      console.error('[category] pilier aggregate error:', e?.message)
    }

    
    
    
    let pilierFaq: CategoryFaqItem[] = []
    try {
      const items = await listFaqsByParent('category', pilier.id, idLang, { event })
      pilierFaq = items
        .filter(it => it.question)
        .map(it => ({ position: it.position, question: it.question, answer_html: it.answer }))
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
        console.error('[category] pilier FAQ error:', e?.message)
      }
    }

    
    
    const pilierFrRow = await db.get<{ link_rewrite: string }>(
      `SELECT link_rewrite FROM ps_category_lang WHERE id_category = ? AND id_lang = 1 AND id_shop = 1 LIMIT 1`,
      [pilier.id],
    )
    const pilierSlugFr = pilierFrRow?.link_rewrite || pilierKey

    
    const pilierTiles = await loadCategoryTiles(db, pilier.id, idLang)

    return {
      found: true,
      kind: 'pilier',
      pilier: pilierKey,
      id_category: pilier.id,
      id_parent: pilierMeta?.id_parent ?? null,
      level_depth: pilierMeta?.level_depth ?? 2,
      path: '',
      path_fr: '',
      pilier_slug_fr: pilierSlugFr,
      
      
      
      
      
      pilier_slug: pilierMeta?.link_rewrite || pilierKey,
      slug: '',
      name: pilierLabel,
      h1: pilierCustomH1 || pilierLabel,
      meta_title: pilierMeta?.meta_title || pilierLabel,
      meta_description: pilierMeta?.meta_description || '',
      intro_html: pilierMeta?.description ?? null,
      long_description_html: pilierMeta?.additional_description ?? null,
      image_url: pilierHeroUrl ?? pilierImages.url,
      image_webp_srcset: pilierHeroUrl ? null : pilierImages.srcset,
      image_sizes: pilierHeroUrl ? null : pilierImages.sizes,
      image_alt: await getImageAlt(pilier.id, idLang, event),
      breadcrumb: [{ label: pilierLabel, path: '' }],
      children: rows.map(r => ({
        id: r.id_category,
        slug: r.link_rewrite,
        path: r.link_rewrite,
        label: r.name,
      })),
      ...(pilierSidebarChildren.length ? { sidebar_children: pilierSidebarChildren } : {}),
      aggregate: pilierAgg,
      faq: pilierFaq,
      tiles: pilierTiles,
      guide_link: await getGuideLink(pilier.id, idLang, event),
      
      index_tier_closed: await isEntityTierClosed(db, 'category', pilier.id),
    }
  }

  
  const leaf = await walkSegments(db, segments, pilier.id, idLang)
  if (!leaf) {
    return {
      found: false,
      kind: 'category',
      pilier: pilierKey,
      id_category: null,
      id_parent: null,
      level_depth: segments.length,
      path: rawPath,
      path_fr: rawPath,
      pilier_slug_fr: pilierKey,
      
      
      pilier_slug: pilierKey,
      slug: segments[segments.length - 1],
      name: '',
      h1: '',
      meta_title: '',
      meta_description: '',
      intro_html: null,
      long_description_html: null,
      image_url: null,
      image_webp_srcset: null,
      image_sizes: null,
      breadcrumb: [],
      children: [],
      aggregate: { total: 0, total_in_stock: null, price_min: null, price_max: null },
      faq: [],
      tiles: [],
    }
  }

  
  const chain = await loadAncestors(db, leaf.id_category, pilier.id, idLang)
  const localizedPath = chain.map(c => c.link_rewrite).join('/')

  
  const chainFrSlugs = await loadAncestorsFr(db, leaf.id_category, pilier.id)
  const pathFr = chainFrSlugs.join('/')

  
  const pilierFrRow2 = await db.get<{ link_rewrite: string }>(
    `SELECT link_rewrite FROM ps_category_lang WHERE id_category = ? AND id_lang = 1 AND id_shop = 1 LIMIT 1`,
    [pilier.id],
  )
  const pilierSlugFr2 = pilierFrRow2?.link_rewrite || pilierKey
  
  
  const pilierRoot = await db.get<{ name: string; link_rewrite: string }>(
    `SELECT COALESCE(cl.name, clf.name, '') AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_category = ? LIMIT 1`,
    [idLang, pilier.id],
  )
  const pilierLabel = pilierRoot?.name || pilierKey
  
  const pilierSlug2 = pilierRoot?.link_rewrite || pilierKey
  const breadcrumb: Array<{ label: string; path: string }> = [
    { label: pilierLabel, path: '' },
  ]
  for (let i = 0; i < chain.length; i++) {
    breadcrumb.push({
      label: chain[i].name || chain[i].link_rewrite,
      path: chain.slice(0, i + 1).map(c => c.link_rewrite).join('/'),
    })
  }

  
  
  
  const childRows = await db.query<CategoryRow>(
    `SELECT c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            cl.additional_description AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_parent = ? AND c.active = 1
        AND (
          c.id_category IN (390, 391, 392)
          OR EXISTS (
            SELECT 1 FROM ps_product p
            JOIN ps_category_product cp ON cp.id_product = p.id_product
            JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
            WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
          )
        )
      ORDER BY (SELECT COUNT(*) FROM ps_category_product cpv WHERE cpv.id_category = c.id_category) DESC,
               c.position ASC`,
    [idLang, leaf.id_category],
  )

  
  
  
  
  
  const sidebarChildren = useRuntimeConfig(event).public.categorySidebarDescendantItems === true
    ? await loadSidebarDescendants(db, childRows, localizedPath, idLang, {
        manufacturersOnly: sidebarManufacturerCategoryIds(event).has(Number(leaf.id_category)),
      })
    : []

  
  
  
  
  
  const parentPathSegments = chain.slice(0, -1).map(c => c.link_rewrite)
  const parentPath = parentPathSegments.join('/')
  let siblingRows: CategoryRow[] = []
  if (childRows.length === 0 && leaf.id_parent && leaf.id_parent !== pilier.id) {
    siblingRows = await db.query<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              cl.additional_description AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1 AND c.id_category != ?
          AND (
            c.id_category IN (390, 391, 392)
            OR EXISTS (
              SELECT 1 FROM ps_product p
              JOIN ps_category_product cp ON cp.id_product = p.id_product
              JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
              WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
            )
          )
        ORDER BY c.position ASC`,
      [idLang, leaf.id_parent, leaf.id_category],
    )
  }

  
  
  
  
  const crossRows = await db.query<CategoryRow & { id_cross_category: number; cross_pos: number; cross_first: number }>(
    `SELECT cc.id_cross_category, cc.position AS cross_pos, cc.cross_first,
            c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            cl.additional_description AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM cs_category_cross cc
       JOIN ps_category c        ON c.id_category = cc.id_cross_category AND c.active = 1
  LEFT JOIN ps_category_lang cl  ON cl.id_category = cc.id_cross_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = cc.id_cross_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE cc.id_category = ?
      ORDER BY cc.position ASC, cc.id_cross_category ASC`,
    [idLang, leaf.id_category],
  ).catch(() => [])
  const crossFirst = crossRows.length > 0 && Number(crossRows[0].cross_first) === 1

  
  
  
  interface CrossChild {
    id: number
    slug: string
    path: string
    label: string
    pilier: string
  }
  const crossChildren: CrossChild[] = []
  for (const cr of crossRows) {
    const chain = await loadAncestors(db, cr.id_category,  2, idLang)
    if (chain.length < 1) continue
    const pilierSlug = chain[0].link_rewrite
    const innerPath = chain.slice(1).map((c) => c.link_rewrite).join('/')
    crossChildren.push({
      id: cr.id_category,
      slug: cr.link_rewrite,
      path: innerPath,
      label: cr.name,
      pilier: pilierSlug,
    })
  }

  
  
  
  
  
  
  
  
  
  
  
  const VIRTUAL = new Map<number, 'nouveautes' | 'promotions' | 'meilleures-ventes'>([
    [390, 'nouveautes'], [391, 'promotions'], [392, 'meilleures-ventes'],
  ])
  let agg: CategoryAggregate = { total: 0, total_in_stock: null, price_min: null, price_max: null }
  try {
    const virtualKind = VIRTUAL.get(leaf.id_category)
    if (virtualKind === 'promotions') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min, MAX(p.price) AS price_max
           FROM ps_product p
           JOIN ps_specific_price sp ON sp.id_product = p.id_product
            AND sp.reduction > 0
            AND (sp.from_quantity <= 1 OR sp.from_quantity IS NULL)
            AND (sp.id_product_attribute = 0 OR sp.id_product_attribute IS NULL)
            AND (sp.\`from\` IS NULL OR sp.\`from\` <= NOW())
            AND (sp.\`to\`   IS NULL OR sp.\`to\`   >= NOW())
          WHERE p.active = 1 AND ${visibiliteSql('p', 'catalog')}`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
        known: true,
      }
    } else if (virtualKind === 'meilleures-ventes') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min, MAX(p.price) AS price_max
           FROM ps_product p
           JOIN (SELECT od.product_id
                   FROM ps_order_detail od
                   JOIN ps_orders o ON o.id_order = od.id_order
                  WHERE o.valid = 1 AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                  GROUP BY od.product_id) bs ON bs.product_id = p.id_product
          WHERE p.active = 1 AND ${visibiliteSql('p', 'catalog')}`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
        known: true,
      }
    } else if (virtualKind === 'nouveautes') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(*) AS total, MIN(price) AS price_min, MAX(price) AS price_max
           FROM ps_product WHERE active = 1 AND ${visibiliteSql('ps_product', 'catalog')}`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
        known: true,
      }
    } else {
      
      
      
      const cachedAgg = (await getCategoryAggMap(db, [leaf.id_category])).get(leaf.id_category)
      const live = cachedAgg ?? (await computeCategoryAggLive(db, leaf.id_category))
      if (live) {
        agg = {
          total: live.total,
          total_in_stock: live.totalInStock,
          price_min: live.priceMin,
          price_max: live.priceMax,
          known: true,
        }
      }
    }
  } catch (e: any) {
    console.error('[category] aggregate error:', e?.message)
  }

  
  let faq: CategoryFaqItem[] = []
  try {
    const items = await listFaqsByParent('category', leaf.id_category, idLang, { event })
    faq = items
      .filter(it => it.question)
      .map(it => ({ position: it.position, question: it.question, answer_html: it.answer }))
  } catch (e: any) {
    if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
      console.error('[category] FAQ error:', e?.message)
    }
  }

  const leafCustomH1 = await getCustomH1(db, leaf.id_category, idLang, event)
  const leafCoverIndex = loadCategoryCoverIndex(event)
  const leafImages = buildImageUrls(leaf.id_category, await getMasterSlug(db, leaf.id_category), leafCoverIndex)
  
  const leafHeroUrl = await getHeroImageUrl(leaf.id_category, event)
  const leafImageInput = { ownHeroUrl: leafHeroUrl, cover: leafImages, coverVerified: leafCoverIndex !== null }
  const leafInherited = needsInheritedImage({ ...leafImageInput, enabled: useRuntimeConfig(event).public.categoryHeroInherit === true })
    ? await getInheritedHeroImage(db, leaf.id_category, idLang, event)
    : null
  const leafImage = chooseCategoryImage({
    ...leafImageInput,
    inherited: leafInherited,
    ownAlt: await getImageAlt(leaf.id_category, idLang, event),
  })
  
  const leafTiles = await loadCategoryTiles(db, leaf.id_category, idLang)

  return {
    found: true,
    kind: 'category',
    pilier: pilierKey,
    id_category: leaf.id_category,
    id_parent: leaf.id_parent,
    level_depth: leaf.level_depth,
    path: localizedPath,
    path_fr: pathFr,
    pilier_slug_fr: pilierSlugFr2,
    pilier_slug: pilierSlug2,
    slug: leaf.link_rewrite,
    name: leaf.name,
    h1: leafCustomH1 || leaf.name,
    meta_title: leaf.meta_title || `${leaf.name} — ${pilierLabel}`,
    meta_description: leaf.meta_description || '',
    intro_html: leaf.description,
    long_description_html: leaf.additional_description,
    image_url: leafImage.url,
    image_webp_srcset: leafImage.srcset,
    image_sizes: leafImage.sizes,
    image_alt: leafImage.alt,
    breadcrumb,
    children: (() => {
      const natives = childRows.map(r => ({
        id: r.id_category,
        slug: r.link_rewrite,
        path: `${localizedPath}/${r.link_rewrite}`,
        label: r.name,
      }))
      
      
      
      const cross = crossChildren.map(c => ({
        id: c.id,
        slug: c.slug,
        path: c.path,
        label: c.label,
        pilier: c.pilier,
      }))
      return crossFirst ? [...cross, ...natives] : [...natives, ...cross]
    })(),
    ...(sidebarChildren.length ? { sidebar_children: sidebarChildren } : {}),
    siblings: siblingRows.map(r => ({
      id: r.id_category,
      slug: r.link_rewrite,
      path: (parentPath ? parentPath + '/' : '') + r.link_rewrite,
      label: r.name,
    })),
    aggregate: agg,
    faq,
    tiles: leafTiles,
    guide_link: await getGuideLink(leaf.id_category, idLang, event),
    index_tier_closed: await isEntityTierClosed(db, 'category', leaf.id_category),
  }
}, {
  maxAge: 1800, 
  name: 'api-category',
  base: 'redis',
  getKey: (event) => {
    const q = getQuery(event)
    const clientId = resolveClientId(event)
    const lang = String(q.lang ?? '').trim().toLowerCase()
      || String(getRequestHeader(event, 'x-lang') ?? '').trim().toLowerCase()
    
    
    const pilier = String(q.pilier ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
    const path = String(q.path ?? '').trim().replace(/^\/+|\/+$/g, '')
    
    
    
    
    
    const sidebarProjection = useRuntimeConfig(event).public.categorySidebarDescendantItems === true
      ? (sidebarManufacturerCategoryIds(event).size ? ':sidebar-descendants-v2' : ':sidebar-descendants-v1')
      : ''
    return `${clientId}:${lang || 'fr'}:${pilier}:${path}${sidebarProjection}`
  },
})
