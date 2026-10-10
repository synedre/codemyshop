

import { useClientDbById, useClientDb, resolveClientId } from '~/server/utils/db'
import { buildCategoryPathMap } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { resolveIdLang, langPrefixFor } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'
import { getProductUrls } from '~/server/utils/product-url'
import { searchDictionarySuggest } from '~/enterprise/seo/dictionnaire/server/utils/dictionary'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'
import { tenantServesDictionary } from '~/server/utils/tenant-dictionary'
import { parseWeightToKg } from '~/server/utils/product-card-mapper'
import { applyTaxToCards } from '~/server/utils/product-card-tax'
import { isTenantB2b } from '~/server/utils/ps-tax'
import { findProductsByAlias, mergeAliasFirst, type AliasHit } from '~/server/utils/part-reference-alias'
import { visibiliteSql } from '~/utils/product-visibility'

type SubtreeBounds = { nleft: number; nright: number } | null

async function resolveSubtreeBounds(
  db: ReturnType<typeof useClientDbById>,
  clientId: string,
  contextKey: string | null,
): Promise<SubtreeBounds> {
  if (!contextKey || contextKey === 'default') return null
  try {
    const ctx = await db.get<{ search_root_category_id: number | null }>(
      `SELECT search_root_category_id
         FROM cs_main.cs_menu_context
        WHERE client_id   = ?
          AND context_key = ?
          AND active      = 1
        LIMIT 1`,
      [clientId, contextKey],
    )
    const rootId = ctx?.search_root_category_id
    if (!rootId) return null
    const cat = await db.get<{ nleft: number; nright: number }>(
      `SELECT nleft, nright FROM ps_category WHERE id_category = ? LIMIT 1`,
      [rootId],
    )
    if (!cat) return null
    return { nleft: Number(cat.nleft), nright: Number(cat.nright) }
  }
  catch {
    return null
  }
}

type SuggestProductRow = { id_product: number; reference: string; name: string; link_rewrite: string; price: number; id_image: number | null; unit_price_ratio: number | null; unity: string | null; weight: number | null; unitsPerPack: string | null; netWeight: string | null; priceDisplayMode: string | null }

function queryProducts(
  db: ReturnType<typeof useClientDbById>,
  idLang: number,
  predicate: string,
  predicateParams: unknown[],
  subtreeClause: string,
  limit: number,
) {
  return db.query<SuggestProductRow>(
    `SELECT p.id_product, p.reference, ps.price,
            COALESCE(pl.name, plf.name, '') AS name,
            COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
            p.unit_price_ratio, p.unity, p.weight,
            (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image,
            MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS "unitsPerPack",
            MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS "netWeight",
            pf.price_display_mode AS "priceDisplayMode"
       FROM ps_product p
       JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
  LEFT JOIN ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ? AND pl.id_shop = 1
  LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
  LEFT JOIN ps_feature_product fp ON fp.id_product = p.id_product
  LEFT JOIN ps_feature_lang fl    ON fl.id_feature = fp.id_feature AND fl.id_lang = ?
                                 AND fl.name IN ('Unités par colis', 'Poids net')
  LEFT JOIN ps_feature_value_lang fvl ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = ?
  LEFT JOIN cs_main.cs_product_food pf ON pf.id_product = p.id_product
      WHERE p.active = 1 AND ps.active = 1 AND ${visibiliteSql('ps', 'search')}
        AND (${predicate})
        ${subtreeClause}
      GROUP BY p.id_product, p.reference, ps.price,
               COALESCE(pl.name, plf.name, ''),
               COALESCE(pl.link_rewrite, plf.link_rewrite, ''),
               p.unit_price_ratio, p.unity, p.weight, pf.price_display_mode
      ORDER BY name
      LIMIT ${limit}`,
    [idLang, idLang, idLang, ...predicateParams],
  )
}

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const CMS_MAX  = 3
const CAT_MAX  = 4
const DICT_MAX = 3
const PROD_MAX = 5

export default defineCachedEventHandler(async (event) => {
  const { q, clientId: qClientId, context } = getQuery(event)
  const term = String(q || '').trim()
  if (term.length < 2) {
    return { products: [], categories: [], cms: [], dictionary: [] }
  }

  
  
  
  const clientId = String(qClientId || resolveClientId(event))
  const idLang = await resolveIdLang(event)
  const unitPricingEnabled = tenantHasUnitPricing(event)
  
  
  const dictionaryEnabled = tenantServesDictionary(event)

  const db = qClientId ? useClientDbById(String(qClientId)) : useClientDb(event)

  
  
  const contextKey = context ? String(context) : null
  const subtreeBounds = await resolveSubtreeBounds(db, clientId, contextKey)

  
  
  const rawTerms = term.split(/\s+/).filter(Boolean)
  let mappedTerm = term
  if (rawTerms.length) {
    try {
      const aliasRows = await db.query<{ alias: string; search: string }>(
        `SELECT alias, search FROM ps_alias WHERE active = 1
          AND LOWER(alias) IN (${rawTerms.map(() => '?').join(',')})`,
        rawTerms.map(t => t.toLowerCase()),
      )
      if (aliasRows.length) {
        const aliasMap = new Map(aliasRows.map(r => [r.alias.toLowerCase(), r.search]))
        mappedTerm = rawTerms.map(t => aliasMap.get(t.toLowerCase()) || t).join(' ')
      }
    } catch {  }
  }
  const like = `%${mappedTerm}%`

  
  
  const subtreeClause = subtreeBounds
    ? `AND p.id_product IN (
         SELECT cp.id_product
           FROM ps_category_product cp
           JOIN ps_category c ON c.id_category = cp.id_category
          WHERE c.nleft BETWEEN ${subtreeBounds.nleft} AND ${subtreeBounds.nright}
       )`
    : ''

  const [productsRes, categoriesRes, cmsRes, dictionaryRes, aliasRes] = await Promise.allSettled([
    
    
    
    
    
    
    queryProducts(db, idLang, 'pl.name ILIKE ? OR plf.name ILIKE ? OR p.reference ILIKE ?', [like, like, like], subtreeClause, PROD_MAX),

    
    
    
    db.query<{ id_category: number; name: string }>(
      `SELECT c.id_category,
              COALESCE(cl.name, clf.name) AS name
       FROM ps_category c
       LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
       LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
       WHERE c.active = 1 AND c.id_category > 2 AND (cl.name ILIKE ? OR clf.name ILIKE ?)
         ${subtreeBounds ? `AND c.nleft BETWEEN ${subtreeBounds.nleft} AND ${subtreeBounds.nright}` : ''}
       ORDER BY LENGTH(COALESCE(cl.name, clf.name)) ASC
       LIMIT ${CAT_MAX}`,
      [idLang, like, like],
    ),

    
    db.query<{ id_cms: number; meta_title: string; link_rewrite: string }>(
      `SELECT c.id_cms,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
       FROM ps_cms c
       LEFT JOIN ps_cms_lang cl  ON cl.id_cms  = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
       LEFT JOIN ps_cms_lang clf ON clf.id_cms = c.id_cms AND clf.id_lang = 1 AND clf.id_shop = 1
       WHERE c.active = 1 AND (cl.meta_title ILIKE ? OR clf.meta_title ILIKE ? OR cl.meta_description ILIKE ? OR clf.meta_description ILIKE ?)
       ORDER BY LENGTH(COALESCE(cl.meta_title, clf.meta_title)) ASC
       LIMIT ${CMS_MAX}`,
      [idLang, like, like, like, like],
    ),

    
    
    
    dictionaryEnabled
      ? searchDictionarySuggest(mappedTerm, DICT_MAX, null, { clientId })
      : Promise.resolve([]),

    
    
    
    
    findProductsByAlias(db, term, PROD_MAX, { clause: subtreeClause, params: [] }),
  ])

  
  
  
  const aliasHits: AliasHit[] = aliasRes.status === 'fulfilled' ? aliasRes.value : []
  const aliasByProduct = new Map(aliasHits.map(h => [h.idProduct, h]))
  let productRows = productsRes.status === 'fulfilled' ? productsRes.value : []
  if (aliasHits.length) {
    const known = new Set(productRows.map(r => Number(r.id_product)))
    const missing = aliasHits.map(h => h.idProduct).filter(id => !known.has(id))
    if (missing.length) {
      const extra = await queryProducts(
        db, idLang, `p.id_product IN (${missing.map(() => '?').join(',')})`, missing, '', missing.length,
      ).catch(() => [] as SuggestProductRow[])
      productRows = [...productRows, ...extra]
    }
    const byId = new Map(productRows.map(r => [Number(r.id_product), r]))
    const order = mergeAliasFirst(aliasHits.map(h => h.idProduct), productRows.map(r => Number(r.id_product)), PROD_MAX)
    productRows = order.map(id => byId.get(id)!).filter(Boolean)
  }

  
  let productUrlMap = new Map<number, string>()
  let productIso = 'fr'
  let productLangPrefix = ''
  if (productRows.length) {
    const langRow = await db.get<{ iso_code: string }>(
      `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`,
      [idLang],
    )
    productIso = langRow?.iso_code || 'fr'
    productLangPrefix = langPrefixFor(event, productIso)
    const tenantPiliers = await resolveTenantPiliers(event, db, idLang).catch(() => [])
    productUrlMap = await getProductUrls(db, productRows.map(r => r.id_product), idLang, {
      langPrefix: productLangPrefix, iso: productIso, resolvedPiliers: tenantPiliers,
    }).catch(() => new Map())
  }

  const products = productRows.map((r) => {
    const matched = aliasByProduct.get(Number(r.id_product))
    const img = buildProductImage(r.id_image, r.link_rewrite)
    const priceHT = Number(r.price)
    
    
    const unitsRaw = r.unitsPerPack ? Number(r.unitsPerPack) : NaN
    const unitsPerPack = Number.isFinite(unitsRaw) && unitsRaw > 1 ? unitsRaw : undefined
    const netWeightKg = parseWeightToKg(r.netWeight)
    const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
    const rawMode = r.priceDisplayMode
    const priceDisplayMode: 'unit' | 'kg' | null = (rawMode === 'unit' || rawMode === 'kg') ? rawMode : null
    const pricing = unitPricingEnabled
      ? deriveUnitPricing({
          priceHT,
          unitPriceRatio: r.unit_price_ratio,
          unity: r.unity,
          unitsPerPack,
          netWeightKg: totalNetKg,
          productWeightKg: Number(r.weight || 0),
          priceDisplayMode,
        })
      : { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
    const slug = r.link_rewrite || `produit-${r.id_product}`
    return {
      id: Number(r.id_product),
      name: String(r.name),
      ref: String(r.reference || ''),
      price: fmtEur(priceHT),
      priceRaw: priceHT,
      pricePerUnitFormatted: pricing.pricePerUnit !== undefined ? fmtEur(pricing.pricePerUnit) : undefined,
      unitLabel: pricing.unitLabel,
      image: img?.src,
      imageSrcset: img?.srcset,
      imageFallback: img?.fallback,
      active: true,
      url: productUrlMap.get(Number(r.id_product)) ?? `${productLangPrefix}/produit/${Number(r.id_product)}-${slug}`,
      ...(matched ? { matchedAlias: { alias: matched.alias, kind: matched.kind } } : {}),
    }
  })

  
  
  
  const priceTaxExcluded = await isTenantB2b(db)
  await applyTaxToCards(db, products)
  for (const p of products) (p as any).priceTaxExcluded = priceTaxExcluded

  
  
  let categories: Array<{ id: number; name: string; href: string }> = []
  if (categoriesRes.status === 'fulfilled' && categoriesRes.value.length) {
    const ids = categoriesRes.value.map(c => c.id_category)
    const piliers = await resolveTenantPiliers(event, db, idLang).catch(() => [])
    const pathMap = await buildCategoryPathMap(db, ids, idLang, piliers).catch(() => new Map())
    categories = categoriesRes.value.map(c => {
      const info = pathMap.get(c.id_category)
      
      
      
      const href = info?.pilier
        ? `/${info.pilier}/${info.path}`
        : info?.path
          ? `/${info.path}`
          : `/catalogue/${c.id_category}`
      return { id: Number(c.id_category), name: c.name, href }
    })
  }

  const cms = cmsRes.status === 'fulfilled'
    ? cmsRes.value.map(c => ({
        id:    Number(c.id_cms),
        title: c.meta_title,
        href:  c.link_rewrite ? `/${c.link_rewrite}` : `/page/${c.id_cms}`,
      }))
    : []
  const dictionary = dictionaryRes.status === 'fulfilled'
    ? dictionaryRes.value.map(d => ({
        slug:    d.slug,
        word:    d.word,
        excerpt: d.excerpt,
        href:    `/dictionnaire/${d.slug}`,
      }))
    : []

  return { products, categories, cms, dictionary }
}, {
  maxAge: 60,             
  name:   'catalogue-suggest',
  getKey: (event) => {
    const q = getQuery(event)
    
    return `${String(q.clientId || resolveClientId(event))}-${String(q.lang || 'fr')}-${String(q.context || 'default')}-${String(q.q || '')}`
  },
})
