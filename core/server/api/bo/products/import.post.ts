

import { useClientDb } from '~/server/utils/db'

import { requireEmployeeSession } from '~/server/utils/session'
import { importFallbackCategory } from '~/server/utils/import-fallback-category'
import { importUnitPriceRatio } from '~/server/utils/unity-label'

interface ImportBody {
  rows: Record<string, any>[]
  mapping: {
    reference?: string
    ean13?: string
    name?: string
    priceHT?: string
    stock?: string
    categoryName?: string
    weight?: string
    unitPriceRatio?: string
    unity?: string
    taxRate?: string
    minimalQty?: string          
    description?: string         
    descriptionShort?: string    
  }
  createMissing?: boolean
  idLang?: number | string       
}

const DESCRIPTION_SHORT_MAX = 800

async function getTableColumns(db: any, table: string): Promise<Set<string>> {
  const rows = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = ? AND table_schema NOT IN ('pg_catalog', 'information_schema')`,
    [table]
  )
  return new Set((rows || []).map((r: any) => String(r.column_name)))
}

function buildInsert(
  table: string, cols: Set<string>, data: Record<string, any>
): { sql: string; params: any[] } {
  const names: string[] = []
  const params: any[] = []
  for (const [col, val] of Object.entries(data)) {
    if (!cols.has(col)) continue
    names.push(col)
    params.push(val)
  }
  const placeholders = names.map(() => '?').join(', ')
  return { sql: `INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders})`, params }
}

function parseNum(v: any): number | undefined {
  if (v === undefined || v === null) return undefined
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.')
  if (s === '') return undefined
  const n = Number(s)
  return Number.isNaN(n) ? undefined : n
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const body = await readBody<ImportBody>(event)
  if (!body || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, message: 'Body invalide : rows manquant' })
  }
  const mapping = body.mapping || {}
  if (!mapping.reference && !mapping.ean13) {
    throw createError({ statusCode: 400, message: 'Mapping minimal requis : reference ou ean13' })
  }

  const db = useClientDb(event)
  const autoCreateCats = body.createMissing === true
  
  const idLang = Math.max(1, parseInt(String(body.idLang ?? 1), 10) || 1)
  
  const catLangCols  = await getTableColumns(db, 'ps_category_lang')
  const prodLangCols = await getTableColumns(db, 'ps_product_lang')
  const stats = {
    total: body.rows.length,
    updated: 0,
    created: 0,
    skipped: 0,
    categoriesCreated: 0,
    errors: [] as Array<{ row: number; reason: string }>,
  }

  
  
  const fallbackCategory = await importFallbackCategory(db)

  
  const catCache = new Map<string, number>()
  
  const taxCache = new Map<string, number>()

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const pick = (field?: string) => (field && row[field] !== undefined ? row[field] : undefined)

    const reference      = pick(mapping.reference)
    const ean13          = pick(mapping.ean13)
    const name           = pick(mapping.name)
    const priceHT        = pick(mapping.priceHT)
    const stock          = pick(mapping.stock)
    const categoryName   = pick(mapping.categoryName)
    const weight         = pick(mapping.weight)
    const unitPriceRatio = pick(mapping.unitPriceRatio)
    const unity          = pick(mapping.unity)
    const taxRateRaw     = pick(mapping.taxRate)
    const description    = pick(mapping.description)
    const descShortRaw   = pick(mapping.descriptionShort)
    const descShort      = descShortRaw !== undefined ? String(descShortRaw).slice(0, DESCRIPTION_SHORT_MAX) : undefined
    const minimalQtyRaw  = pick(mapping.minimalQty)

    
    let existingId: number | null = null
    try {
      if (reference && String(reference).trim()) {
        const r = await db.get<any>(
          `SELECT id_product FROM ps_product WHERE reference = ? AND reference != '' LIMIT 1`,
          [String(reference).trim()]
        )
        if (r?.id_product) existingId = Number(r.id_product)
      }
      if (!existingId && ean13 && String(ean13).trim()) {
        const r = await db.get<any>(
          `SELECT id_product FROM ps_product WHERE ean13 = ? AND ean13 != '' LIMIT 1`,
          [String(ean13).trim()]
        )
        if (r?.id_product) existingId = Number(r.id_product)
      }
    } catch (err: any) {
      stats.errors.push({ row: i + 1, reason: `match failed: ${err.message || String(err)}` })
      continue
    }

    if (existingId) {
      
      try {
        
        const pfProduct: string[] = []
        const ppProduct: any[] = []
        
        const pfBoth: string[] = []
        const ppBoth: any[] = []

        if (reference !== undefined) { pfProduct.push('reference = ?'); ppProduct.push(String(reference).trim()) }
        if (ean13 !== undefined) { pfProduct.push('ean13 = ?'); ppProduct.push(String(ean13).trim()) }
        const wtNum = parseNum(weight)
        if (wtNum !== undefined) { pfProduct.push('weight = ?'); ppProduct.push(wtNum) }
        const priceNum = parseNum(priceHT)
        if (priceNum !== undefined) { pfBoth.push('price = ?'); ppBoth.push(priceNum) }
        const uprNum = importUnitPriceRatio(parseNum(unitPriceRatio), unity, parseNum(minimalQtyRaw))
        if (uprNum !== undefined) { pfBoth.push('unit_price_ratio = ?'); ppBoth.push(uprNum) }
        if (unity !== undefined && String(unity).trim()) {
          pfBoth.push('unity = ?'); ppBoth.push(String(unity).trim())
        }
        if (taxRateRaw !== undefined && taxRateRaw !== '') {
          const taxGroupId = await resolveTaxGroup(db, taxRateRaw, taxCache)
          if (taxGroupId > 0) { pfBoth.push('id_tax_rules_group = ?'); ppBoth.push(taxGroupId) }
        }
        const minQtyNum = parseNum(minimalQtyRaw)
        if (minQtyNum !== undefined && minQtyNum >= 1) {
          pfBoth.push('minimal_quantity = ?'); ppBoth.push(Math.round(minQtyNum))
        }

        
        const pfAll = [...pfProduct, ...pfBoth]
        const ppAll = [...ppProduct, ...ppBoth]
        if (pfAll.length) {
          await db.run(
            `UPDATE ps_product SET ${[...pfAll, 'date_upd = NOW()'].join(', ')} WHERE id_product = ?`,
            [...ppAll, existingId]
          )
        }
        
        if (pfBoth.length) {
          await db.run(
            `UPDATE ps_product_shop SET ${[...pfBoth, 'date_upd = NOW()'].join(', ')} WHERE id_product = ?`,
            [...ppBoth, existingId]
          ).catch(() => {})
        }
        
        const langFields: string[] = []
        const langParams: any[] = []
        if (name !== undefined && String(name).trim()) {
          langFields.push('name = ?'); langParams.push(String(name).trim())
        }
        if (descShort !== undefined && String(descShort).trim()) {
          langFields.push('description_short = ?'); langParams.push(String(descShort))
        }
        if (description !== undefined && String(description).trim()) {
          langFields.push('description = ?'); langParams.push(String(description))
        }
        if (langFields.length) {
          const upd = await db.run(
            `UPDATE ps_product_lang SET ${langFields.join(', ')} WHERE id_product = ? AND id_lang = ?`,
            [...langParams, existingId, idLang]
          )
          
          
          if ((upd?.affectedRows ?? 0) === 0 && name !== undefined && String(name).trim()) {
            const ins = buildInsert('ps_product_lang', prodLangCols, {
              id_product: existingId, id_shop: 1, id_lang: idLang,
              name: String(name).trim(),
              description: description !== undefined ? String(description) : '',
              description_short: descShort !== undefined ? String(descShort) : '',
              link_rewrite: slugify(String(name)),
            })
            await db.run(ins.sql, ins.params).catch(() => {})
          }
        }
        
        const qtyNum = parseNum(stock)
        if (qtyNum !== undefined) {
          await db.run(
            `UPDATE ps_stock_available SET quantity = ? WHERE id_product = ? AND id_product_attribute = 0`,
            [qtyNum, existingId]
          )
        }
        stats.updated++
      } catch (err: any) {
        stats.errors.push({ row: i + 1, reason: `update failed: ${err.message || String(err)}` })
      }
    } else if (body.createMissing) {
      
      
      if (!name || !String(name).trim()) {
        stats.skipped++
        stats.errors.push({ row: i + 1, reason: 'name required for create' })
        continue
      }
      try {
        const price  = parseNum(priceHT) ?? 0
        const qty    = parseNum(stock) ?? 0
        const ref    = reference !== undefined ? String(reference).trim() : ''
        const ean    = ean13 !== undefined ? String(ean13).trim() : ''
        const wt     = parseNum(weight) ?? 0
        const upr    = importUnitPriceRatio(parseNum(unitPriceRatio), unity, parseNum(minimalQtyRaw)) ?? 0
        const uty    = (unity !== undefined && String(unity).trim()) ? String(unity).trim() : ''
        const minQty = Math.max(1, Math.round(parseNum(minimalQtyRaw) ?? 1))

        
        let taxGroupId = 0
        if (taxRateRaw !== undefined && taxRateRaw !== '') {
          taxGroupId = await resolveTaxGroup(db, taxRateRaw, taxCache)
        }

        
        const resolvedCategory = await resolveOrCreateCategory(
          db, categoryName, catCache, fallbackCategory, autoCreateCats,
          idLang, catLangCols,
          () => { stats.categoriesCreated++ }
        )

        const insertProd = await db.run(`
          INSERT INTO ps_product
            (id_supplier, id_manufacturer, id_category_default, id_shop_default,
             id_tax_rules_group, on_sale, online_only, ean13, isbn, upc, mpn,
             ecotax, quantity, minimal_quantity, low_stock_alert, price, wholesale_price,
             unity, unit_price_ratio, additional_shipping_cost, reference, supplier_reference,
             location, width, height, depth, weight, out_of_stock, additional_delivery_times,
             quantity_discount, customizable, uploadable_files, text_fields, active,
             redirect_type, id_type_redirected, available_for_order, show_condition,
             condition, show_price, indexed, visibility, cache_is_pack, cache_has_attachments,
             is_virtual, cache_default_attribute, date_add, date_upd,
             advanced_stock_management, pack_stock_type, state)
          VALUES
            (0, 0, ?, 1,
             ?, 0, 0, ?, '', '', '',
             0, 0, ?, 0, ?, 0,
             ?, ?, 0, ?, '',
             '', 0, 0, 0, ?, 2, 1,
             0, 0, 0, 0, 1,
             '', 0, 1, 0,
             'new', 1, 0, 'both', 0, 0,
             0, 0, NOW(), NOW(),
             0, 3, 1)
        `, [resolvedCategory, taxGroupId, ean, minQty, price, uty, upr, ref, wt]) as any

        const newId = Number(insertProd?.insertId || insertProd?.lastInsertId || 0)
        if (!newId) throw new Error('id_product introuvable après INSERT')

        
        await db.run(`
          INSERT INTO ps_product_shop
            (id_product, id_shop, id_category_default, id_tax_rules_group, on_sale,
             online_only, ecotax, minimal_quantity, low_stock_alert, price,
             wholesale_price, unity, unit_price_ratio, additional_shipping_cost,
             customizable, uploadable_files, text_fields, active, redirect_type,
             id_type_redirected, available_for_order, show_condition, condition,
             show_price, indexed, visibility, cache_default_attribute, advanced_stock_management,
             date_add, date_upd, pack_stock_type)
          VALUES
            (?, 1, ?, ?, 0,
             0, 0, ?, 0, ?,
             0, ?, ?, 0,
             0, 0, 0, 1, '',
             0, 1, 0, 'new',
             1, 0, 'both', 0, 0,
             NOW(), NOW(), 3)
        `, [newId, resolvedCategory, taxGroupId, minQty, price, uty, upr])

        
        const slug = slugify(String(name))
        const descLong  = (description !== undefined && String(description).trim()) ? String(description) : ''
        const descShortIns = (descShort !== undefined && String(descShort).trim()) ? String(descShort) : ''
        const prodLangIns = buildInsert('ps_product_lang', prodLangCols, {
          id_product: newId, id_shop: 1, id_lang: idLang,
          description: descLong, description_short: descShortIns, link_rewrite: slug,
          meta_description: '', meta_title: '', name: String(name).trim(),
          available_now: '', available_later: '',
          delivery_in_stock: '', delivery_out_stock: '',
        })
        await db.run(prodLangIns.sql, prodLangIns.params)

        
        await db.run(`
          INSERT INTO ps_stock_available
            (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
             physical_quantity, reserved_quantity, depends_on_stock, out_of_stock, location)
          VALUES
            (?, 0, 1, 0, ?, ?, 0, 0, 2, '')
        `, [newId, qty, qty])

        
        await db.run(
          `INSERT IGNORE INTO ps_category_product (id_category, id_product, position) VALUES (?, ?, 0)`,
          [resolvedCategory, newId]
        )

        stats.created++
      } catch (err: any) {
        stats.errors.push({ row: i + 1, reason: `create failed: ${err.message || String(err)}` })
      }
    } else {
      stats.skipped++
    }
  }

  return { success: true, stats }
})

async function resolveTaxGroup(db: any, rateRaw: any, cache: Map<string, number>): Promise<number> {
  const rate = parseNum(rateRaw) ?? NaN
  if (Number.isNaN(rate) || rate < 0) return 0
  const key = rate.toFixed(2)
  if (cache.has(key)) return cache.get(key)!
  const found = await db.get<any>(`
    SELECT tg.id_tax_rules_group
    FROM ps_tax_rules_group tg
    JOIN ps_tax_rule tr ON tr.id_tax_rules_group = tg.id_tax_rules_group
    JOIN ps_tax t ON t.id_tax = tr.id_tax
    WHERE ABS(t.rate - ?) < 0.01 AND tg.active = 1 AND tg.deleted = 0 AND t.deleted = 0
    ORDER BY tg.id_tax_rules_group ASC
    LIMIT 1
  `, [rate])
  const id = found?.id_tax_rules_group ? Number(found.id_tax_rules_group) : 0
  cache.set(key, id)
  return id
}

async function resolveOrCreateCategory(
  db: any,
  nameRaw: any,
  catCache: Map<string, number>,
  fallbackId: number,
  autoCreate: boolean,
  idLang: number,
  catLangCols: Set<string>,
  onCreated?: () => void
): Promise<number> {
  if (!nameRaw || !String(nameRaw).trim()) return fallbackId
  const nameTrimmed = String(nameRaw).trim()
  const key = nameTrimmed.toLowerCase()
  if (catCache.has(key)) return catCache.get(key)!

  const found = await db.get<any>(
    `SELECT id_category FROM ps_category_lang WHERE LOWER(name) = ? AND id_lang = ? LIMIT 1`,
    [key, idLang]
  )
  if (found?.id_category) {
    const id = Number(found.id_category)
    catCache.set(key, id)
    return id
  }

  if (!autoCreate) {
    catCache.set(key, fallbackId)
    return fallbackId
  }

  
  
  const homeRow = await db.get<any>(`SELECT nright FROM ps_category WHERE id_category = 2`)
  const insertLeft = Number(homeRow?.nright ?? 4)

  
  await db.run(`UPDATE ps_category SET nright = nright + 2 WHERE nright >= ?`, [insertLeft])
  await db.run(`UPDATE ps_category SET nleft  = nleft  + 2 WHERE nleft  >= ?`, [insertLeft])

  const catSlug = slugify(nameTrimmed)
  const insertResult = await db.run(`
    INSERT INTO ps_category
      (id_parent, id_shop_default, level_depth, nleft, nright, active, date_add, date_upd, position, is_root_category)
    VALUES
      (2, 1, 2, ?, ?, 1, NOW(), NOW(), 0, 0)
  `, [insertLeft, insertLeft + 1]) as any

  const newCatId = Number(insertResult?.insertId || 0)
  if (!newCatId) throw new Error(`Échec création catégorie "${nameTrimmed}"`)

  
  
  
  const catLangIns = buildInsert('ps_category_lang', catLangCols, {
    id_category: newCatId, id_shop: 1, id_lang: idLang,
    name: nameTrimmed, description: '', additional_description: '',
    link_rewrite: catSlug, meta_title: '', meta_keywords: '', meta_description: '',
  })
  await db.run(catLangIns.sql, catLangIns.params)

  await db.run(
    `INSERT IGNORE INTO ps_category_shop (id_category, id_shop, position) VALUES (?, 1, 0)`,
    [newCatId]
  )

  catCache.set(key, newCatId)
  onCreated?.()
  return newCatId
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'produit'
}
