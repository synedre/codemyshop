

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang, langPrefixFor } from '~/server/utils/lang'
import { buildImageUrl, buildImageSrcset } from '~/server/utils/product-urls'
import { getProductUrls } from '~/server/utils/product-url'
import { localizeRootSegment } from '~/utils/locale-route-roots'
import { buildCategoryPathMap as buildCategoryPathMapShared, type CategoryPathInfo } from '~/server/utils/category-path'
import { resolveTenantPiliers, type ResolvedPilier } from '~/server/utils/tenant-piliers'
import { isTenantB2b, buildTaxJoinForPrice, buildPriceExpr, isPriceRoundUp, roundDisplayPrice } from '~/server/utils/ps-tax'
import { buildVirtualPromoSql, resolvePriceMode } from '~/server/utils/virtual-category-promo'
import {
  canonicalizeCountry,
  detectAllergens,
  parseOriginFilter,
  parseAllergensFilter,
} from '~/server/utils/food-mdm-facets'
import { listFoodSpecsForProductIds } from '~/enterprise/vertical-food/product-food/server/utils/product-food'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'
import { applyCdnCovers } from '~/server/utils/cover-cdn'
import { attachTaxRateToCards } from '~/server/utils/product-card-tax'
import { attachRatingToCards } from '~/server/utils/product-card-rating'
import { attachImageThumbnails } from '~/server/utils/product-card-images'
import { computeFitmentChips } from '~/server/utils/fitment-card-chips'
import { loadAliasesByRef, groupAliasesForDisplay } from '~/server/utils/part-reference-alias'
import { getCategoryAggMap } from '~/server/utils/category-agg'
import { splitFacetFilterValues } from '~/utils/facet-filter'
import { hasFacetFamilyMap, familyMemberSubquery } from '~/server/utils/facet-family-db'
import { selectConfiguredAttributeGroups } from '~/server/utils/attribute-facet-groups'
import { t } from '~/server/utils/i18n'
import {
  computeCardAttributes,
  computeProductBadges,
  type ProductCardBadge,
  type CardBadgesConfig,
} from '~/server/utils/product-card-mapper'
import { visibiliteSql } from '~/utils/product-visibility'
import { expandAttrSiblings } from '~/server/utils/attribute-facet-siblings'
import {
  categoryChildFacetEnabled, categoryChildJoinSql, computeCategoryChildChips, loadCategoryChildren,
  normalizeCategoryChildParam, parseCategoryChildParam, selectCheckedChildren,
  type CategoryChild,
} from '~/server/utils/category-child-filter'

const VIRTUAL_CATEGORIES = {
  390: 'nouveautes',
  391: 'promotions',
  392: 'meilleures-ventes',
} as const

const pilierIdCache = new Map<string, number | null>()

async function resolvePilierId(db: any, slug: string): Promise<number | null> {
  if (!slug) return null
  if (pilierIdCache.has(slug)) return pilierIdCache.get(slug)!
  const row = await db.get<{ id_category: number }>(
    `SELECT c.id_category FROM ps_category c
       JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
      WHERE cl.link_rewrite = ? AND c.active = 1
      ORDER BY c.level_depth ASC, c.id_category ASC LIMIT 1`,
    [slug],
  )
  const id = row?.id_category ?? null
  pilierIdCache.set(slug, id)
  return id
}

interface ProductCard {
  id: number
  ref: string
  ean13?: string
  name: string
  slug: string
  price: string
  priceRaw: number
  image?: string
  imageSrcset?: string
  
  imageThumbnails?: string[]
  url: string
  format?: string
  netWeight?: string
  packaging?: string
  caliber?: string
  unitsPerPack?: number
  totalWeightKg?: number
  pricePerKg?: number
  pricePerKgFormatted?: string
  

  unitLabel?: string
  pricePromo?: string
  pricePromoRaw?: number
  pricePerKgPromo?: number
  pricePerKgPromoFormatted?: string
  savingsRaw?: number
  savingsFormatted?: string
  reductionLabel?: string
  
  stockQuantity?: number
  

  attributes?: string[]
  

  badges?: ProductCardBadge[]
  

  aliases?: string[]
  

  rating?: number
  reviewCount?: number
}

interface ByCategoryResponse {
  products: ProductCard[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

type SortKey =
  | 'relevance'
  | 'price-asc' | 'price-desc'
  | 'weight-asc' | 'weight-desc'
  | 'price-kg-asc' | 'price-kg-desc'
  | 'ref-asc' | 'ref-desc'
  | 'name-asc' | 'name-desc'
  | 'ean13-asc' | 'ean13-desc'

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function parseWeightToKg(s: string | null | undefined): number | null {
  if (!s) return null
  const m = String(s).trim().toLowerCase().replace(',', '.').match(/^([\d.]+)\s*(kg|g)$/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return m[2] === 'kg' ? n : n / 1000
}

async function buildCategoryPathMap(
  db: any,
  ids: number[],
  idLang: number,
  piliers: ResolvedPilier[],
): Promise<Map<number, CategoryPathInfo>> {
  return buildCategoryPathMapShared(db, ids, idLang, piliers)
}

function parseFeatures(raw: string | undefined): Record<number, number[]> {
  if (!raw) return {}
  const out: Record<number, number[]> = {}
  for (const block of String(raw).split('|')) {
    const [fIdStr, valsStr] = block.split(':')
    const fId = Number(fIdStr)
    if (!fId || !valsStr) continue
    const vals = valsStr.split(',').map(Number).filter(Boolean)
    if (vals.length) out[fId] = vals
  }
  return out
}

function normalizeFilters(raw: string | undefined): string {
  const features = parseFeatures(raw)
  const keys = Object.keys(features).map(Number).sort((a, b) => a - b)
  return keys
    .map(fId => `${fId}:${features[fId].slice().sort((a, b) => a - b).join(',')}`)
    .join('|')
}

function parseAttrs(raw: string | undefined): Record<number, number[]> {
  if (!raw) return {}
  const out: Record<number, number[]> = {}
  for (const block of String(raw).split('|')) {
    const [gIdStr, valsStr] = block.split(':')
    const gId = Number(gIdStr)
    if (!gId || !valsStr) continue
    const vals = valsStr.split(',').map(Number).filter(Boolean)
    if (vals.length) out[gId] = vals
  }
  return out
}

function normalizeAttrs(raw: string | undefined): string {
  const attrs = parseAttrs(raw)
  const keys = Object.keys(attrs).map(Number).sort((a, b) => a - b)
  return keys
    .map(gId => `${gId}:${attrs[gId].slice().sort((a, b) => a - b).join(',')}`)
    .join('|')
}

export default defineCachedEventHandler(async (event): Promise<ByCategoryResponse> => {
  const tenant = resolveClientId(event)
  const q = getQuery(event)
  const idCategory = Number(q.id_category ?? q.idCategory ?? 0)
  const offset = Math.max(0, Number(q.offset) || 0)
  const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 1000)
  const rawSort = String(q.sort ?? 'relevance') as SortKey

  if (!Number.isFinite(idCategory) || idCategory <= 0) {
    return { products: [], total: 0, offset, limit, hasMore: false }
  }

  const db = useClientDb(event)
  
  
  
  
  
  
  
  
  
  const pilierRaw = q.pilier ? String(q.pilier).toLowerCase().replace(/[^a-z0-9-]/g, '') : null
  const pilierParam = pilierRaw || ''
  const [idLang, priceIsHt, roundUp, pilierId] = await Promise.all([
    resolveIdLang(event),
    isTenantB2b(db),
    isPriceRoundUp(db),
    pilierParam ? resolvePilierId(db, pilierParam).then(v => v ?? 0) : Promise.resolve(0),
  ])

  
  
  const taxJoin = buildTaxJoinForPrice(priceIsHt)
  const priceExpr = buildPriceExpr(priceIsHt, 'p.price')
  const prefixFr = pilierParam

  
  
  
  
  
  
  
  const [tenantPiliers, langRow, badgePromo, badgeNew] = await Promise.all([
    resolveTenantPiliers(event, db, idLang),
    db.get<{ iso_code: string }>(`SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`, [idLang]),
    t('catalogue.badge_promo', idLang, 'Promotion'),
    t('catalogue.badge_new', idLang, 'Nouveauté'),
  ])

  const unitPricingEnabled = tenantHasUnitPricing(event)
  const defaultProductImage = ((useRuntimeConfig(event).public as any)?.defaultProductImage) as string | undefined
  
  
  
  const cardAttrsRaw = (useRuntimeConfig(event).public as any)?.cardAttributes
  const cardAttrs: string[] = Array.isArray(cardAttrsRaw) ? cardAttrsRaw.filter(Boolean).map(String) : []
  
  
  
  const cardBadges = (useRuntimeConfig(event).public as any)?.cardBadges as CardBadgesConfig | undefined
  
  
  const configuredThumbnailCount = Number((useRuntimeConfig(event).public as any)?.categoryCardImageThumbnails)
  const categoryCardImageThumbnails = Number.isInteger(configuredThumbnailCount)
    && configuredThumbnailCount > 0 && configuredThumbnailCount <= 6
    ? configuredThumbnailCount
    : 0
  
  
  
  
  const fitmentChipsEnabled = (useRuntimeConfig(event).public as any)?.fitmentCardChips === true

  const iso = langRow?.iso_code || 'fr'
  const langPrefix = langPrefixFor(event, iso)
  const prefix = localizeRootSegment(prefixFr, iso)

  
  const originFilter = parseOriginFilter(q.origin as string | undefined)
  const allergenFilter = parseAllergensFilter(q.allergens as string | undefined)
  const hasMdmFilter = originFilter.size > 0 || allergenFilter.size > 0

  
  
  
  
  
  
  
  
  const activeFeatures = parseFeatures(q.f as string | undefined)
  
  
  
  
  const attrFacetsRaw = (useRuntimeConfig(event).public as any)?.attributeFacets
  const attrFacetsEnabled = Array.isArray(attrFacetsRaw) && attrFacetsRaw.length > 0
  
  
  const activeAttrs = attrFacetsEnabled ? parseAttrs(q.a as string | undefined) : {}
  if (Object.keys(activeAttrs).length) {
    const attrGroups = await db.query<{ id_attribute_group: number; public_name: string }>(
      `SELECT agl.id_attribute_group, agl.public_name
         FROM ps_attribute_group_lang agl
        WHERE agl.id_lang = ?`,
      [idLang],
    )
    const allowedGroupIds = new Set(
      selectConfiguredAttributeGroups(attrFacetsRaw, attrGroups)
        .map(group => Number(group.id_attribute_group)),
    )
    for (const groupId of Object.keys(activeAttrs).map(Number)) {
      if (!allowedGroupIds.has(groupId)) delete activeAttrs[groupId]
    }
    
    Object.assign(activeAttrs, await expandAttrSiblings(db, activeAttrs, idLang))
  }
  const priceMin = q.priceMin !== undefined && q.priceMin !== '' ? Number(q.priceMin) : undefined
  const priceMax = q.priceMax !== undefined && q.priceMax !== '' ? Number(q.priceMax) : undefined

  
  
  const catChildren: CategoryChild[] = categoryChildFacetEnabled(useRuntimeConfig(event).public, idCategory)
    ? await loadCategoryChildren(db, idCategory, idLang)
    : []
  const catChildJoinSql = categoryChildJoinSql(
    selectCheckedChildren(catChildren, parseCategoryChildParam(q.c as string | undefined)),
  )

  
  
  
  
  
  
  
  
  
  const filtreFamille = Object.values(activeFeatures).some(
    (vals) => splitFacetFilterValues(vals as number[]).familyIds.length > 0,
  )
  const familyMapDispo = filtreFamille ? await hasFacetFamilyMap(db) : false
  const featureJoinParts: string[] = []
  const featureJoinParams: any[] = []
  for (const [fIdStr, vals] of Object.entries(activeFeatures)) {
    const fId = Number(fIdStr)
    if (!fId || !vals.length) continue
    const { valueIds, familyIds } = splitFacetFilterValues(vals as number[])
    const alias = `_fp${fId}`
    const conds: string[] = []
    const condParams: any[] = []
    if (valueIds.length) {
      conds.push(`${alias}.id_feature_value IN (${valueIds.map(() => '?').join(',')})`)
      condParams.push(...valueIds)
    }
    if (familyIds.length && familyMapDispo) {
      conds.push(familyMemberSubquery(alias, `IN (${familyIds.map(() => '?').join(',')})`))
      condParams.push(...familyIds)
    }
    if (!conds.length) continue
    featureJoinParts.push(
      `JOIN ps_feature_product ${alias}` +
      ` ON ${alias}.id_product = p.id_product` +
      ` AND ${alias}.id_feature = ?` +
      ` AND (${conds.join(' OR ')})`,
    )
    featureJoinParams.push(fId, ...condParams)
  }
  const featureJoinSql = featureJoinParts.join('\n         ')

  
  
  
  
  
  
  const attrJoinParts: string[] = []
  const attrJoinParams: any[] = []
  for (const [gIdStr, vals] of Object.entries(activeAttrs)) {
    const gId = Number(gIdStr)
    if (!gId || !vals.length) continue
    const pa = `_pa${gId}`
    const pac = `_pac${gId}`
    attrJoinParts.push(
      `JOIN ps_product_attribute ${pa}` +
      ` ON ${pa}.id_product = p.id_product` +
      ` JOIN ps_product_attribute_combination ${pac}` +
      ` ON ${pac}.id_product_attribute = ${pa}.id_product_attribute` +
      ` AND ${pac}.id_attribute IN (${(vals as number[]).map(() => '?').join(',')})`,
    )
    attrJoinParams.push(...(vals as number[]))
  }
  const attrJoinSql = attrJoinParts.join('\n         ')

  
  const priceWhereParts: string[] = []
  const priceWhereParams: any[] = []
  if (priceMin !== undefined && Number.isFinite(priceMin) && priceMin > 0) {
    priceWhereParts.push('p.price >= ?')
    priceWhereParams.push(priceMin)
  }
  if (priceMax !== undefined && Number.isFinite(priceMax) && priceMax < 999999) {
    priceWhereParts.push('p.price <= ?')
    priceWhereParams.push(priceMax)
  }
  const priceWhereSql = priceWhereParts.length ? ' AND ' + priceWhereParts.join(' AND ') : ''

  

  const virtualKind = (VIRTUAL_CATEGORIES as Record<number, string>)[idCategory] ?? null

  
  
  
  
  
  
  const SQL_ORDER: Record<SortKey, string | null> = {
    'relevance':     `MIN(CASE WHEN cp.id_category = ${idCategory} THEN cp.position END) IS NULL, MIN(CASE WHEN cp.id_category = ${idCategory} THEN cp.position END) ASC, MIN(cp.position) ASC, p.id_product ASC`,
    'price-asc':     'p.price ASC, p.id_product ASC',
    'price-desc':    'p.price DESC, p.id_product ASC',
    'weight-asc':    'p.weight ASC, p.id_product ASC',
    'weight-desc':   'p.weight DESC, p.id_product ASC',
    'price-kg-asc':  null,
    'price-kg-desc': null,
    'ref-asc':       'p.reference ASC, p.id_product ASC',
    'ref-desc':      'p.reference DESC, p.id_product ASC',
    'name-asc':      'pl.name ASC, p.id_product ASC',
    'name-desc':     'pl.name DESC, p.id_product ASC',
    'ean13-asc':     'p.ean13 ASC, p.id_product ASC',
    'ean13-desc':    'p.ean13 DESC, p.id_product ASC',
  }
  const sort: SortKey = (rawSort in SQL_ORDER) ? rawSort : 'relevance'
  const useSqlPagination = SQL_ORDER[sort] !== null

  
  if (virtualKind) {
    return handleVirtualCategory(
      db, idLang, virtualKind, offset, limit, sort,
      { iso, langPrefix, prefix, tenant, pilierId, tenantPiliers, unitPricingEnabled, defaultProductImage, cardAttrs, cardBadges, categoryCardImageThumbnails },
    )
  }

  
  try {
    
    
    
    
    
    
    
    
    const noFilters = featureJoinParts.length === 0 && attrJoinParts.length === 0 && !catChildJoinSql && priceWhereParts.length === 0 && !hasMdmFilter
    const computeLiveTotal = async (): Promise<number> => {
      const totalRows = await db.query<{ total: number }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT COUNT(DISTINCT p.id_product) AS total
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1 AND ${visibiliteSql('p', 'catalog')}
           ${featureJoinSql}
           ${attrJoinSql}
           ${catChildJoinSql}
          WHERE 1=1${priceWhereSql}`,
        [idCategory, ...featureJoinParams, ...attrJoinParams, ...priceWhereParams],
      )
      return Number(totalRows[0]?.total ?? 0)
    }
    let total: number
    if (noFilters) {
      const cached = (await getCategoryAggMap(db, [idCategory])).get(idCategory)
      total = cached ? cached.total : await computeLiveTotal()
    } else {
      total = await computeLiveTotal()
    }
    if (total === 0) return { products: [], total: 0, offset, limit, hasMore: false }

    
    let filteredIds: number[] | null = null
    let filteredTotal = total
    if (hasMdmFilter) {
      
      
      
      const allIdsRows = await db.query<{ id_product: number }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT DISTINCT p.id_product
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1 AND ${visibiliteSql('p', 'catalog')}
           ${featureJoinSql}
           ${attrJoinSql}
           ${catChildJoinSql}
          WHERE 1=1${priceWhereSql}`,
        [idCategory, ...featureJoinParams, ...attrJoinParams, ...priceWhereParams],
      )
      const allIds = allIdsRows.map(r => Number(r.id_product))
      if (!allIds.length) return { products: [], total: 0, offset, limit, hasMore: false }
      const specs = await listFoodSpecsForProductIds(allIds, { event })
      const specMap = new Map(specs.map(s => [s.idProduct, s]))
      filteredIds = allIds.filter(id => {
        const spec = specMap.get(id)
        if (!spec) return false
        if (originFilter.size) {
          const c = canonicalizeCountry(spec.countryOrigin)
          if (!c || !originFilter.has(c)) return false
        }
        if (allergenFilter.size) {
          const detected = detectAllergens(spec.allergensJson)
          let match = false
          for (const a of allergenFilter) { if (detected.has(a)) { match = true; break } }
          if (!match) return false
        }
        return true
      })
      filteredTotal = filteredIds.length
      if (!filteredTotal) return { products: [], total: 0, offset, limit, hasMore: false }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    const mdmPh = filteredIds?.length ? filteredIds.map(() => '?').join(',') : ''
    const mdmClause = mdmPh ? ` AND p.id_product IN (${mdmPh})` : ''
    const mdmParams = filteredIds ?? []
    const orderBy = SQL_ORDER[sort] ?? 'p.id_product ASC'
    const sqlLimit = useSqlPagination ? limit : 2000
    const sqlOffset = useSqlPagination ? offset : 0
    
    
    const needsNameJoin = sort === 'name-asc' || sort === 'name-desc'

    
    const idRows = await db.query<{ id: number }>(
      `WITH RECURSIVE cat_tree AS (
         SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
         UNION ALL
         SELECT c.id_category FROM ps_category c
         INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
         WHERE c.active = 1
       )
       SELECT p.id_product AS id
         FROM cat_tree t
         JOIN ps_category_product cp ON cp.id_category = t.id_category
         JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1 AND ${visibiliteSql('p', 'catalog')}
         ${needsNameJoin ? 'JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?' : ''}
         ${featureJoinSql}
         ${attrJoinSql}
         ${catChildJoinSql}
        WHERE 1=1${mdmClause}${priceWhereSql}
        GROUP BY p.id_product${needsNameJoin ? ', pl.name' : ''}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [idCategory, ...(needsNameJoin ? [idLang] : []), ...featureJoinParams, ...attrJoinParams, ...mdmParams, ...priceWhereParams, sqlLimit, sqlOffset],
    )
    const pageIds = idRows.map(r => Number(r.id))
    if (!pageIds.length) {
      return { products: [], total: filteredTotal, offset, limit, hasMore: false }
    }

    
    const idPh = pageIds.map(() => '?').join(',')
    const enrichedRows = await db.query<any>(
      `SELECT p.id_product AS id,
              p.reference  AS ref,
              p.ean13      AS ean13,
              p.id_category_default AS id_category_default,
              pl.name         AS name,
              pl.link_rewrite AS link_rewrite,
              ${priceExpr} AS priceRaw,
              p.weight AS weightKg,
              p.unit_price_ratio AS unitPriceRatio,
              p.unity            AS unity,
              p.date_add         AS "dateAdd",
              COALESCE(sa.quantity, 0) AS stockQuantity,
              img.id_image AS id_image,
              MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
              MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
              MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS unitsPerPack,
              MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS netWeight,
              MAX(sp.reduction)      AS reduction,
              MAX(sp.reduction_type) AS reduction_type,
              pf.price_display_mode  AS "priceDisplayMode"
         FROM ps_product p
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
    LEFT JOIN ps_stock_available sa ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
    LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
    LEFT JOIN ps_feature_product fp ON fp.id_product = p.id_product
    LEFT JOIN ps_feature_lang fl
           ON fl.id_feature = fp.id_feature AND fl.id_lang = ?
          AND fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
    LEFT JOIN ps_feature_value_lang fvl
           ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = ?
    LEFT JOIN ps_specific_price sp ON sp.id_product = p.id_product
          AND sp.reduction > 0
          AND (sp.from_quantity <= 1 OR sp.from_quantity IS NULL)
          AND (sp.id_product_attribute = 0 OR sp.id_product_attribute IS NULL)
          AND (sp."from" IS NULL OR sp."from" <= NOW())
          AND (sp."to"   IS NULL OR sp."to"   >= NOW())
    LEFT JOIN cs_main.cs_product_food pf ON pf.id_product = p.id_product
         ${taxJoin}
        WHERE p.id_product IN (${idPh})
        GROUP BY p.id_product, p.reference, p.ean13, p.id_category_default,
                 pl.name, pl.link_rewrite, p.price, p.weight, p.date_add,
                 sa.quantity, img.id_image, pf.price_display_mode`,
      [idLang, idLang, idLang, ...pageIds],
    )
    
    const enrichedById = new Map(enrichedRows.map((r: any) => [Number(r.id), r]))
    const rows = pageIds.map(id => enrichedById.get(id)).filter(Boolean)

    
    const productIds = [...new Set(rows.map(r => Number(r.id)))]

    
    
    
    
    
    
    
    const idCategoriesToResolve = [
      ...new Set([idCategory, ...rows.map(r => Number(r.id_category_default))].filter(Boolean)),
    ]
    const [urlMap, pathMap, attrsMap] = await Promise.all([
      getProductUrls(db, productIds, idLang, { langPrefix, iso, resolvedPiliers: tenantPiliers }),
      buildCategoryPathMap(db, idCategoriesToResolve, idLang, tenantPiliers),
      cardAttrs.length ? computeCardAttributes(db, productIds, idLang, cardAttrs) : Promise.resolve(new Map<number, any>()),
    ])
    const contextCatPath = pathMap.get(idCategory)?.path || ''

    
    
    
    
    
    const products = rows.map(r => mapRowToCard(r, {
      langPrefix, prefix, tenant, pathMap, pilierId,
      priceMode: Number(r.reduction || 0) > 0 ? 'promo' : 'standard',
      contextCatPath, unitPricingEnabled, defaultProductImage,
      urlMap, roundUp,
    }))
    
    
    if (cardAttrs.length) {
      for (const p of products) {
        const a = attrsMap.get(p.id)
        if (a) p.attributes = a
      }
    }
    
    
    
    if (catChildren.length) {
      const chipMap = await computeCategoryChildChips(db, productIds, catChildren)
      for (const p of products) {
        const chip = chipMap.get(p.id)
        if (chip) p.attributes = [chip, ...(p.attributes ?? []).filter((a: string) => a !== chip)]
      }
    }
    
    
    
    if (fitmentChipsEnabled) {
      const [moreLabel, powerUnit] = await Promise.all([
        t('catalogue.fitment_more', idLang, '+{n} motorisations'),
        t('catalogue.fitment_power_unit', idLang, 'cv'),
      ])
      const fitMap = await computeFitmentChips(db, products, idCategory, { moreLabel, powerUnit })
      for (const p of products) {
        if (p.attributes?.length) continue
        const a = fitMap.get(p.id)
        if (a) p.attributes = a
      }
    }

    
    
    
    
    
    
    
    
    
    const rowsById = new Map(rows.map((r: any) => [Number(r.id), { reduction: r.reduction, dateAdd: r.dateAdd }]))
    const [, badgesMap, aliasMap] = await Promise.all([
      applyCdnCovers(db, products, { tenant }),
      computeProductBadges(db, productIds, idLang, rowsById, cardBadges, {
        promo: badgePromo, newLabel: badgeNew,
      }),
      loadAliasesByRef(db, products.map(p => p.ref)),
      
      
      
      attachTaxRateToCards(db, products),
      
      
      
      
      attachRatingToCards(db, products),
      categoryCardImageThumbnails
        ? attachImageThumbnails(db, products, { limit: categoryCardImageThumbnails })
        : Promise.resolve(products),
    ])
    for (const p of products) {
      const b = badgesMap.get(p.id)
      if (b && b.length) p.badges = b
      const a = aliasMap.get(p.ref)
      if (a?.length) p.aliases = groupAliasesForDisplay(a).map(x => x.alias)
    }

    let finalProducts = products
    if (!useSqlPagination) {
      const dir = sort === 'price-kg-asc' ? 1 : -1
      const INF = Number.POSITIVE_INFINITY
      finalProducts = [...products].sort((a, b) => {
        const av = a.pricePerKg ?? INF
        const bv = b.pricePerKg ?? INF
        return av === bv ? a.id - b.id : (av - bv) * dir
      }).slice(offset, offset + limit)
    }

    return {
      products: finalProducts,
      total: filteredTotal,
      offset,
      limit,
      hasMore: offset + finalProducts.length < filteredTotal,
    }
  } catch (err: any) {
    console.error('[by-category] DB error:', err?.message)
    return { products: [], total: 0, offset, limit, hasMore: false }
  }
}, {
  maxAge: 300, 
  name: 'api-by-category',
  base: 'redis',
  getKey: (event) => {
    const q = getQuery(event)
    const clientId = resolveClientId(event)
    const lang = String(q.lang ?? '').trim().toLowerCase()
      || String(getRequestHeader(event, 'x-lang') ?? '').trim().toLowerCase()
    
    
    const idCategory = Number(q.id_category ?? q.idCategory ?? 0)
    const offset = Math.max(0, Number(q.offset) || 0)
    const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 1000)
    const sort = String(q.sort ?? 'relevance')
    const pilier = String(q.pilier ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
    return [
      clientId, lang || 'fr', idCategory, offset, limit, sort, pilier,
      q.priceMin ?? '', q.priceMax ?? '',
      normalizeFilters(q.f as string | undefined),
      normalizeAttrs(q.a as string | undefined),
      String(q.origin ?? ''), String(q.allergens ?? ''),
      
      ...(normalizeCategoryChildParam(q.c as string | undefined) ? [`c=${normalizeCategoryChildParam(q.c as string | undefined)}`] : []),
    ].join('|')
  },
})

async function handleVirtualCategory(
  db: any,
  idLang: number,
  kind: 'nouveautes' | 'promotions' | 'meilleures-ventes',
  offset: number,
  limit: number,
  sort: SortKey,
  ctx: { iso: string; langPrefix: string; prefix: string; tenant: string | null; pilierId: number; tenantPiliers: ResolvedPilier[]; unitPricingEnabled: boolean; defaultProductImage?: string; cardAttrs: string[]; cardBadges?: CardBadgesConfig; categoryCardImageThumbnails: number },
): Promise<ByCategoryResponse> {
  const isPromo = kind === 'promotions'
  const isBestSellers = kind === 'meilleures-ventes'

  
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExpr(b2b, 'p.price')

  
  
  
  
  
  
  
  
  
  const promo = buildVirtualPromoSql(kind)
  const promoJoin = promo.join

  const bestSellersJoin = isBestSellers
    ? `JOIN (SELECT od.product_id, SUM(od.product_quantity) AS qty_sold
              FROM ps_order_detail od
              JOIN ps_orders o ON o.id_order = od.id_order
             WHERE o.valid = 1 AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
             GROUP BY od.product_id) bs ON bs.product_id = p.id_product`
    : ''

  const defaultOrder = isPromo
    ? 'MAX(sp.reduction) DESC, p.id_product DESC'
    : isBestSellers
      ? 'MAX(bs.qty_sold) DESC, p.id_product DESC'
      : 'p.date_add DESC, p.id_product DESC'
  const orderMap: Record<SortKey, string | null> = {
    'relevance':     defaultOrder,
    'price-asc':     'p.price ASC, p.id_product ASC',
    'price-desc':    'p.price DESC, p.id_product ASC',
    'weight-asc':    'p.weight ASC, p.id_product ASC',
    'weight-desc':   'p.weight DESC, p.id_product ASC',
    'ref-asc':       'p.reference ASC, p.id_product ASC',
    'ref-desc':      'p.reference DESC, p.id_product ASC',
    'name-asc':      'pl.name ASC, p.id_product ASC',
    'name-desc':     'pl.name DESC, p.id_product ASC',
    'ean13-asc':     'p.ean13 ASC, p.id_product ASC',
    'ean13-desc':    'p.ean13 DESC, p.id_product ASC',
    'price-kg-asc':  null,
    'price-kg-desc': null,
  }
  const orderBy = orderMap[sort] ?? defaultOrder
  const useSqlPagination = orderMap[sort] !== null
  const sqlLimit = useSqlPagination ? limit : 2000
  const sqlOffset = useSqlPagination ? offset : 0

  
  
  
  const selectExtra = promo.select + (isBestSellers ? ', MAX(bs.qty_sold) AS qty_sold' : '')

  try {
    
    
    
    const totalRows = await db.query<{ total: number }>(
      `SELECT COUNT(DISTINCT p.id_product) AS total
         FROM ps_product p
         ${isPromo ? promoJoin : ''}
         ${bestSellersJoin}
        WHERE p.active = 1 AND ${visibiliteSql('p', 'catalog')}`,
    )
    const total = Number(totalRows[0]?.total ?? 0)
    if (!total) return { products: [], total: 0, offset, limit, hasMore: false }

    const rows = await db.query<any>(
      `SELECT p.id_product AS id,
              p.reference  AS ref,
              p.ean13      AS ean13,
              p.id_category_default AS id_category_default,
              pl.name         AS name,
              pl.link_rewrite AS link_rewrite,
              ${priceExpr} AS priceRaw,
              p.weight AS weightKg,
              p.unit_price_ratio AS unitPriceRatio,
              p.unity            AS unity,
              p.date_add         AS "dateAdd",
              COALESCE(sa.quantity, 0) AS stockQuantity,
              img.id_image AS id_image,
              MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
              MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
              MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS unitsPerPack,
              MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS netWeight,
              pf.price_display_mode  AS "priceDisplayMode"
              ${selectExtra}
         FROM ps_product p
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
    LEFT JOIN ps_stock_available sa ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
    LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
    LEFT JOIN ps_feature_product fp ON fp.id_product = p.id_product
    LEFT JOIN ps_feature_lang fl
           ON fl.id_feature = fp.id_feature AND fl.id_lang = ?
          AND fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
    LEFT JOIN ps_feature_value_lang fvl
           ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = ?
    LEFT JOIN cs_main.cs_product_food pf ON pf.id_product = p.id_product
         ${promoJoin}
         ${bestSellersJoin}
         ${taxJoin}
        WHERE p.active = 1 AND ${visibiliteSql('p', 'catalog')}
        GROUP BY p.id_product, p.reference, p.ean13, p.id_category_default,
                 pl.name, pl.link_rewrite, p.price, p.weight, p.date_add,
                 sa.quantity, img.id_image, pf.price_display_mode
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [idLang, idLang, idLang, sqlLimit, sqlOffset],
    )

    
    const productIds = [...new Set(rows.map(r => Number(r.id)))]
    const urlMap = await getProductUrls(db, productIds, idLang, {
      langPrefix: ctx.langPrefix, iso: ctx.iso, resolvedPiliers: ctx.tenantPiliers,
    })

    const idCategoriesToResolve = [
      ...new Set(rows.map(r => Number(r.id_category_default)).filter(Boolean)),
    ]
    const pathMap = await buildCategoryPathMap(db, idCategoriesToResolve, idLang, ctx.tenantPiliers)
    const roundUp = await isPriceRoundUp(db)
    
    
    
    
    const products = rows.map(r => mapRowToCard(r, {
      langPrefix: ctx.langPrefix, prefix: ctx.prefix, tenant: ctx.tenant,
      pathMap, pilierId: ctx.pilierId, priceMode: resolvePriceMode(r.reduction),
      unitPricingEnabled: ctx.unitPricingEnabled, defaultProductImage: ctx.defaultProductImage,
      urlMap, roundUp,
    }))
    
    await applyCdnCovers(db, products, { tenant: ctx.tenant })

    
    
    await attachTaxRateToCards(db, products)

    
    
    
    await attachRatingToCards(db, products)
    if (ctx.categoryCardImageThumbnails) {
      await attachImageThumbnails(db, products, { limit: ctx.categoryCardImageThumbnails })
    }

    
    if (ctx.cardAttrs.length) {
      const attrsMap = await computeCardAttributes(db, productIds, idLang, ctx.cardAttrs)
      for (const p of products) {
        const a = attrsMap.get(p.id)
        if (a) p.attributes = a
      }
    }

    
    
    
    
    {
      const rowsById = new Map(rows.map((r: any) => [Number(r.id), { reduction: r.reduction, dateAdd: r.dateAdd }]))
      const badgeLabelPromo = await t('catalogue.badge_promo', idLang, 'Promotion')
      const badgeLabelNew = await t('catalogue.badge_new', idLang, 'Nouveauté')
      const badgesMap = await computeProductBadges(db, productIds, idLang, rowsById, ctx.cardBadges, {
        promo: badgeLabelPromo, newLabel: badgeLabelNew,
      })
      for (const p of products) {
        const b = badgesMap.get(p.id)
        if (b && b.length) p.badges = b
      }
    }

    
    
    {
      const aliasMap = await loadAliasesByRef(db, products.map(p => p.ref))
      if (aliasMap.size) {
        for (const p of products) {
          const a = aliasMap.get(p.ref)
          if (a?.length) p.aliases = groupAliasesForDisplay(a).map(x => x.alias)
        }
      }
    }

    let finalProducts = products
    if (!useSqlPagination) {
      const dir = sort === 'price-kg-asc' ? 1 : -1
      const INF = Number.POSITIVE_INFINITY
      finalProducts = [...products].sort((a, b) => {
        const av = a.pricePerKg ?? INF
        const bv = b.pricePerKg ?? INF
        return av === bv ? a.id - b.id : (av - bv) * dir
      }).slice(offset, offset + limit)
    }

    return {
      products: finalProducts,
      total,
      offset,
      limit,
      hasMore: offset + finalProducts.length < total,
    }
  } catch (err: any) {
    console.error(`[by-category/virtual:${kind}] error:`, err?.message)
    return { products: [], total: 0, offset, limit, hasMore: false }
  }
}

function mapRowToCard(
  r: any,
  ctx: {
    langPrefix: string
    prefix: string
    tenant: string | null
    pathMap: Map<number, CategoryPathInfo>
    pilierId: number
    priceMode: 'standard' | 'promo'
    contextCatPath?: string  
    

    unitPricingEnabled: boolean
    defaultProductImage?: string
    
    urlMap?: Map<number, string>
    
    roundUp?: boolean
  },
): ProductCard {
  const price = roundDisplayPrice(Number(r.priceRaw || 0), ctx.roundUp === true)
  const imgId = Number(r.id_image || 0)
  const slug = r.link_rewrite || `produit-${r.id}`
  
  
  
  const url = ctx.urlMap?.get(Number(r.id)) ?? `${ctx.langPrefix}/produit/${Number(r.id)}-${slug}`

  const weightKg = r.weightKg != null ? Number(r.weightKg) : undefined
  const unitsRaw = r.unitsPerPack ? Number(r.unitsPerPack) : NaN
  const unitsPerPack = Number.isFinite(unitsRaw) && unitsRaw > 1 ? unitsRaw : undefined

  
  
  
  let format: string | undefined
  if (ctx.unitPricingEnabled) {
    if (unitsPerPack && r.netWeight) format = `${unitsPerPack} × ${r.netWeight}`
    else if (r.netWeight) format = r.netWeight
    else if (weightKg && weightKg > 0) {
      format = weightKg < 1
        ? `${Math.round(weightKg * 1000)}g`
        : weightKg < 10
          ? `${weightKg.toFixed(weightKg % 1 === 0 ? 0 : 1).replace('.', ',')}kg`
          : `${Math.round(weightKg)}kg`
    }
  }

  const netWeightKg = parseWeightToKg(r.netWeight)
  
  
  
  
  const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
  
  
  const rawMode = r.priceDisplayMode
  const priceDisplayMode: 'unit' | 'kg' | null = (rawMode === 'unit' || rawMode === 'kg') ? rawMode : null
  const { pricePerUnit: pricePerKg, unitLabel, divisor: unitDivisor } = ctx.unitPricingEnabled
    ? deriveUnitPricing({
        priceHT: price,
        unitPriceRatio: r.unitPriceRatio,
        unity: r.unity,
        unitsPerPack,
        netWeightKg: totalNetKg,
        productWeightKg: weightKg,
        priceDisplayMode,
      })
    : { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
  
  
  const totalWeightKg = unitDivisor

  const card: ProductCard = {
    id: Number(r.id),
    ref: r.ref || '',
    ean13: r.ean13 || undefined,
    name: r.name,
    slug,
    price: fmtEur(price),
    priceRaw: price,
    image: buildImageUrl(imgId, 'home', r.link_rewrite, ctx.tenant ?? undefined, ctx.defaultProductImage),
    imageSrcset: buildImageSrcset(imgId, r.link_rewrite),
    url,
    format,
    netWeight: r.netWeight || undefined,
    packaging: r.packaging || undefined,
    caliber: r.caliber || undefined,
    unitsPerPack,
    totalWeightKg,
    pricePerKg,
    pricePerKgFormatted: pricePerKg !== undefined ? fmtEur(pricePerKg) : undefined,
    unitLabel,
    stockQuantity: r.stockQuantity != null ? Number(r.stockQuantity) : undefined,
  }

  if (ctx.priceMode === 'promo') {
    const reduction = Number(r.reduction || 0)
    const isPct = r.reduction_type === 'percentage'
    
    const pricePromoRaw = roundDisplayPrice(
      isPct ? price * (1 - reduction) : Math.max(0, price - reduction),
      ctx.roundUp === true)
    card.pricePromo = fmtEur(pricePromoRaw)
    card.pricePromoRaw = pricePromoRaw
    card.reductionLabel = isPct ? `-${Math.round(reduction * 100)}%` : `-${fmtEur(reduction)}`
    if (totalWeightKg && totalWeightKg > 0) {
      const pricePerKgPromoRaw = pricePromoRaw / totalWeightKg
      card.pricePerKgPromo = pricePerKgPromoRaw
      card.pricePerKgPromoFormatted = fmtEur(pricePerKgPromoRaw)
    }
    const savingsRaw = Math.max(0, price - pricePromoRaw)
    card.savingsRaw = savingsRaw
    card.savingsFormatted = fmtEur(savingsRaw)
  }

  return card
}
