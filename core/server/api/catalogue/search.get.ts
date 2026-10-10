

import { useClientDb, useClientDbById, resolveClientId } from '~/server/utils/db'
import type { PgAdapterClient } from '~/server/utils/db-pg-adapter'
import { resolveIdLang } from '~/server/utils/lang'
import { embedQuery, toPgVector } from '~/server/utils/mistral-embed'
import { fetchProductCardsByIds } from '~/server/utils/product-card-mapper'
import { applyTaxToCards } from '~/server/utils/product-card-tax'
import { buildSearchPatterns, buildSearchSqlTerms, buildSearchCteQuery, motsPresents, requeteTronquee } from '~/utils/search-terms'
import { normalizeSearchToken } from '~/server/utils/search-normalize'
import { baseSupporteUnaccent } from '~/server/utils/search-unaccent'
import { findProductsByAlias, mergeAliasFirst } from '~/server/utils/part-reference-alias'
import { hasCanonicalCategoryUrl, resolveSearchMinUrlSegments } from '~/utils/search-result-url'
import { visibiliteSql } from '~/utils/product-visibility'

const FALLBACK_LANG = 1

interface SearchRow {
  id_product: number
  reference: string
  name: string
  link_rewrite: string
  price: number
  id_image: number | null
  score?: number
}

async function resolveSearchRootCategoryId(
  db: PgAdapterClient,
  clientId: string,
  contextKey: string | null,
): Promise<number | null> {
  if (!contextKey || contextKey === 'default') return null
  try {
    const row = await db.get<{ search_root_category_id: number | null }>(
      `SELECT search_root_category_id
         FROM cs_main.cs_menu_context
        WHERE client_id  = ?
          AND context_key = ?
          AND active      = 1
        LIMIT 1`,
      [clientId, contextKey],
    )
    return row?.search_root_category_id ?? null
  }
  catch {
    
    return null
  }
}

async function buildCategorySubtreeFilter(
  db: PgAdapterClient,
  rootCategoryId: number | null,
): Promise<{ nleft: number; nright: number } | null> {
  if (rootCategoryId == null) return null
  try {
    const row = await db.get<{ nleft: number; nright: number }>(
      `SELECT nleft, nright FROM ps_category WHERE id_category = ? LIMIT 1`,
      [rootCategoryId],
    )
    if (!row) return null
    return { nleft: Number(row.nleft), nright: Number(row.nright) }
  }
  catch {
    return null
  }
}

const LEX_SUFFICIENT = 3  
const VALID_MODES = ['lex', 'sem', 'hybrid'] as const

async function resolveSearchMode(db: PgAdapterClient, queryMode: unknown): Promise<string> {
  const fromQuery = String(queryMode || '').toLowerCase()
  if (VALID_MODES.includes(fromQuery as any)) return fromQuery
  try {
    const row = await db.get<{ value: string | null }>(
      `SELECT value FROM ps_configuration WHERE name = 'AC_SEARCH_MODE' LIMIT 1`,
    )
    const fromDb = String(row?.value || '').toLowerCase()
    if (VALID_MODES.includes(fromDb as any)) return fromDb
  } catch {  }
  return 'lex'
}

export default defineEventHandler(async (event) => {
  const { q, clientId, limit, mode, context } = getQuery(event)
  if (!q) return { products: [] }

  const idLang = await resolveIdLang(event)
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)
  const requestedMode = await resolveSearchMode(db, mode)

  
  
  
  const contextKey = context ? String(context) : null
  const effectiveClientId = String(clientId || resolveClientId(event))
  const rootCategoryId = await resolveSearchRootCategoryId(db, effectiveClientId, contextKey)
  const subtreeBounds = await buildCategorySubtreeFilter(db, rootCategoryId)

  
  const rawTerms = String(q).trim().split(/\s+/).filter(Boolean)
  let mappedTerms = rawTerms
  if (rawTerms.length) {
    try {
      const aliasRows = await db.query<{ alias: string; search: string }>(
        `SELECT alias, search FROM ps_alias WHERE active = 1
          AND LOWER(alias) IN (${rawTerms.map(() => '?').join(',')})`,
        rawTerms.map(t => t.toLowerCase()),
      )
      if (aliasRows.length) {
        const aliasMap = new Map(aliasRows.map(r => [r.alias.toLowerCase(), r.search]))
        mappedTerms = rawTerms.map(t => aliasMap.get(t.toLowerCase()) || t)
      }
    } catch {  }
  }
  const finalQuery = mappedTerms.join(' ')
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const motsSaisis = normalizeSearchToken(finalQuery)
  const patterns = buildSearchPatterns(motsSaisis)
  if (!patterns.length) return { products: [] }

  
  let resolvedMode: 'lex' | 'sem' | 'hybrid' = 'lex'
  let queryVector: string | null = null

  if (requestedMode === 'sem' || requestedMode === 'hybrid') {
    const v = await embedQuery(finalQuery)
    if (v) {
      queryVector = toPgVector(v)
      resolvedMode = requestedMode as 'sem' | 'hybrid'
    } else {
      
      resolvedMode = 'lex'
    }
  }

  try {
    const unaccent = await baseSupporteUnaccent(db, effectiveClientId)
    const rows = resolvedMode === 'lex'
      ? await runLexicalSearch(db, idLang, patterns, lim, subtreeBounds, unaccent)
      : resolvedMode === 'sem'
        ? await runSemanticSearch(db, idLang, queryVector!, lim, subtreeBounds)
        : await runHybridSearch(db, idLang, patterns, queryVector!, lim, subtreeBounds, unaccent, !requeteTronquee(motsSaisis))

    
    
    
    
    const aliasIds = (await findProductsByAlias(db, String(q), lim, subtreeClause(subtreeBounds))).map(h => h.idProduct)

    
    
    
    const ids = mergeAliasFirst(aliasIds, rows.map(r => Number(r.id_product)), lim)
    const cards = await fetchProductCardsByIds(db, idLang, ids, {
      tenant: resolveClientId(event),
      clientId: String(clientId || resolveClientId(event)),
      event,
    })
    
    
    
    await applyTaxToCards(db, cards)
    
    const scoreById = new Map(rows.filter(r => r.score !== undefined).map(r => [Number(r.id_product), Number(r.score)]))
    const minSegments = resolveSearchMinUrlSegments((useRuntimeConfig(event).public as any)?.searchMinUrlSegments)
    const products = cards
      .filter(c => hasCanonicalCategoryUrl((c as any).url, minSegments))
      .map(c => ({ ...c, ...(scoreById.has(c.id) ? { score: scoreById.get(c.id) } : {}) }))

    return {
      products,
      mode:    resolvedMode,
      requested: requestedMode,
      
      context:        contextKey,
      scopedCategory: rootCategoryId,
    }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { products: [] }
    console.error('[search] DB error:', err?.message)
    return { products: [] }
  }
})

type SubtreeBounds = { nleft: number; nright: number } | null

function subtreeClause(bounds: SubtreeBounds): { clause: string; params: number[] } {
  if (!bounds) return { clause: '', params: [] }
  return {
    clause: `AND p.id_product IN (
      SELECT cp.id_product
        FROM ps_category_product cp
        JOIN ps_category c ON c.id_category = cp.id_category
       WHERE c.nleft BETWEEN ? AND ?
    )`,
    params: [bounds.nleft, bounds.nright],
  }
}

async function runLexicalSearch(
  db: PgAdapterClient,
  idLang: number,
  patterns: string[],
  lim: number,
  bounds: SubtreeBounds = null,
  unaccent = false,
): Promise<SearchRow[]> {
  if (!patterns.length) return []
  const { clause, params } = subtreeClause(bounds)
  const avecRepli = idLang !== FALLBACK_LANG

  const { query, params: queryParams } = buildSearchCteQuery(
    patterns,
    idLang,
    {
      unaccent,
      avecRepli,
      fallbackLang: FALLBACK_LANG,
      candidateLimit: Math.max(lim * 2, 100),
    },
    { clause, params },
    lim,
  )

  return db.query<SearchRow>(query, queryParams)
}

async function runSemanticSearch(
  db: PgAdapterClient,
  idLang: number,
  queryVector: string,
  lim: number,
  bounds: SubtreeBounds = null,
  onlyIds: number[] | null = null,
): Promise<SearchRow[]> {
  const { clause, params } = subtreeClause(bounds)
  
  const ids = onlyIds?.length ? onlyIds.map(Number).filter(Number.isFinite) : null
  const idsClause = ids ? `AND p.id_product IN (${ids.map(() => '?').join(',')})` : ''
  return db.query<SearchRow>(
    `SELECT p.id_product, p.reference, ps.price,
            COALESCE(pl.name, plf.name, '') AS name,
            COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
            (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image,
            (1.0 - (e.embedding <=> ?::vector)) AS score
       FROM cs_product_embedding e
       JOIN ps_product p          ON p.id_product = e.id_product AND p.active = 1
       JOIN ps_product_shop ps    ON ps.id_product = p.id_product AND ps.id_shop = 1 AND ps.active = 1 AND ${visibiliteSql('ps', 'search')}
  LEFT JOIN ps_product_lang pl    ON pl.id_product = p.id_product  AND pl.id_lang  = ? AND pl.id_shop = 1
  LEFT JOIN ps_product_lang plf   ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
      WHERE e.id_lang = ?
        ${clause}
        ${idsClause}
      ORDER BY e.embedding <=> ?::vector
      LIMIT ?`,
    [queryVector, idLang, idLang, ...params, ...(ids || []), queryVector, lim],
  )
}

async function runHybridSearch(
  db: PgAdapterClient,
  idLang: number,
  patterns: string[],
  queryVector: string,
  lim: number,
  bounds: SubtreeBounds = null,
  unaccent = false,
  relacher = true,
): Promise<SearchRow[]> {
  let lexRows = await runLexicalSearch(db, idLang, patterns, lim, bounds, unaccent)
  if (lexRows.length >= LEX_SUFFICIENT) return lexRows

  
  
  
  
  
  
  if (relacher && !lexRows.length && patterns.length >= 2) {
    const presents = await Promise.all(patterns.map(async p =>
      (await runLexicalSearch(db, idLang, [p], 1, bounds, unaccent)).length > 0))
    const gardes = motsPresents(patterns, presents)
    if (gardes) {
      const candidats = await runLexicalSearch(db, idLang, gardes, Math.max(lim * 2, 100), bounds, unaccent)
      if (candidats.length) {
        const classes = await runSemanticSearch(db, idLang, queryVector, lim, bounds, candidats.map(r => Number(r.id_product)))
        
        const vus = new Set(classes.map(r => Number(r.id_product)))
        lexRows = [...classes, ...candidats.filter(r => !vus.has(Number(r.id_product)))].slice(0, lim)
      }
    }
  }

  
  
  const semRows = await runSemanticSearch(db, idLang, queryVector, lim, bounds)
  const seen = new Set(lexRows.map(r => Number(r.id_product)))
  const merged = [...lexRows]
  for (const r of semRows) {
    if (merged.length >= lim) break
    if (seen.has(Number(r.id_product))) continue
    seen.add(Number(r.id_product))
    merged.push(r)
  }
  return merged
}
