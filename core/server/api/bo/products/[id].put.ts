

import { useClientDb } from '~/server/utils/db'
import { invalidateCategoryPathCache } from '~/server/utils/category-path'
import { snapshotEntityUrls, poseRedirectsForMovedUrls } from '~/server/utils/rename-redirect'

import { requireEmployeeSession } from '~/server/utils/session'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'
import { upsertPriceDisplayMode } from '~/enterprise/vertical-food/product-food/server/utils/product-food'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionProductSavedPayload } from '~/server/utils/hooks-catalog'
import { slugForProductReactivation } from '~/server/utils/product-reactivation'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)
  const productId = Number(id)

  const exists = await db.get<{ id_product: number; active: number }>(
    `SELECT id_product, active FROM ps_product WHERE id_product = ?`,
    [productId],
  )
  if (!exists) throw createError({ statusCode: 404, message: 'Produit introuvable' })

  if (isMaster && body.active && !exists.active && body.linkRewrite === undefined) {
    const masterLanguage = await db.get<{ name: string | null; link_rewrite: string | null }>(
      `SELECT name, link_rewrite FROM ps_product_lang WHERE id_product = ? AND id_lang = 1 AND id_shop = 1 LIMIT 1`,
      [productId],
    )
    const regeneratedSlug = slugForProductReactivation({
      wasActive: false,
      nextActive: true,
      currentSlug: masterLanguage?.link_rewrite,
      name: masterLanguage?.name,
    })
    if (regeneratedSlug)
      body.linkRewrite = regeneratedSlug
  }

  
  
  
  
  
  
  
  
  
  
  
  const urlsMayMove = body.linkRewrite !== undefined
    || body.categoryId !== undefined
    || Array.isArray(body.categoryIds)
  const urlsBefore = await snapshotEntityUrls(db, {
    event, kind: 'product', ids: urlsMayMove ? [productId] : [],
  })

  
  
  
  
  
  
  
  
  
  const shf: string[] = []   
  const shp: any[] = []
  const pof: string[] = []   
  const pop: any[] = []

  if (body.priceHT !== undefined) { shf.push('price = ?'); shp.push(Number(body.priceHT)) }
  if (body.wholesalePrice !== undefined) { shf.push('wholesale_price = ?'); shp.push(Number(body.wholesalePrice)) }
  if (body.active !== undefined) { shf.push('active = ?'); shp.push(body.active ? 1 : 0) }
  if (body.categoryId !== undefined) { shf.push('id_category_default = ?'); shp.push(Number(body.categoryId)) }
  if (body.availableForOrder !== undefined) { shf.push('available_for_order = ?'); shp.push(body.availableForOrder ? 1 : 0) }
  if (body.showPrice !== undefined) { shf.push('show_price = ?'); shp.push(body.showPrice ? 1 : 0) }
  if (body.additionalShippingCost !== undefined) { shf.push('additional_shipping_cost = ?'); shp.push(Number(body.additionalShippingCost) || 0) }
  if (body.taxRulesGroupId !== undefined) { shf.push('id_tax_rules_group = ?'); shp.push(Number(body.taxRulesGroupId) || 0) }
  if (body.unity !== undefined && tenantHasUnitPricing(event)) { shf.push('unity = ?'); shp.push(String(body.unity || '')) }
  if (body.unitPriceRatio !== undefined && tenantHasUnitPricing(event)) { shf.push('unit_price_ratio = ?'); shp.push(Number(body.unitPriceRatio) || 0) }

  if (body.reference !== undefined) { pof.push('reference = ?'); pop.push(String(body.reference)) }
  if (body.ean13 !== undefined) { pof.push('ean13 = ?'); pop.push(String(body.ean13)) }
  if (body.weight !== undefined) { pof.push('weight = ?'); pop.push(Number(body.weight)) }
  if (body.width !== undefined) { pof.push('width = ?'); pop.push(Number(body.width) || 0) }
  if (body.height !== undefined) { pof.push('height = ?'); pop.push(Number(body.height) || 0) }
  if (body.depth !== undefined) { pof.push('depth = ?'); pop.push(Number(body.depth) || 0) }

  if (isMaster && (shf.length || pof.length)) {
    
    const allF = [...shf, ...pof, 'date_upd = NOW()']
    await db.run(`UPDATE ps_product SET ${allF.join(', ')} WHERE id_product = ?`, [...shp, ...pop, productId])
    
    
    if (shf.length) {
      await db.run(
        `UPDATE ps_product_shop SET ${[...shf, 'date_upd = NOW()'].join(', ')} WHERE id_product = ? AND id_shop = 1`,
        [...shp, productId],
      )
    }
  }

  
  
  
  
  
  
  
  const hasLangFields = [
    'name', 'description', 'descriptionShort', 'metaTitle', 'metaDescription',
    'linkRewrite', 'deliveryInStock', 'deliveryOutStock',
  ].some((k) => body[k] !== undefined)

  if (hasLangFields) {
    const base = await db.get<any>(`
      SELECT name, description, description_short, link_rewrite,
             meta_title, meta_description,
             available_now, available_later, delivery_in_stock, delivery_out_stock
        FROM ps_product_lang
       WHERE id_product = ? AND id_lang = 1 AND id_shop = 1
       LIMIT 1
    `, [productId])

    const row = {
      name: body.name !== undefined ? String(body.name) : (base?.name || ''),
      description: body.description !== undefined ? String(body.description) : (base?.description || ''),
      description_short: body.descriptionShort !== undefined ? String(body.descriptionShort) : (base?.description_short || ''),
      link_rewrite: body.linkRewrite !== undefined ? String(body.linkRewrite) : (base?.link_rewrite || ''),
      meta_title: body.metaTitle !== undefined ? String(body.metaTitle) : (base?.meta_title || ''),
      meta_description: body.metaDescription !== undefined ? String(body.metaDescription) : (base?.meta_description || ''),
      available_now: base?.available_now || '',
      available_later: base?.available_later || '',
      delivery_in_stock: body.deliveryInStock !== undefined ? String(body.deliveryInStock || '') : (base?.delivery_in_stock || ''),
      delivery_out_stock: body.deliveryOutStock !== undefined ? String(body.deliveryOutStock || '') : (base?.delivery_out_stock || ''),
    }

    await db.run(`
      INSERT INTO ps_product_lang
        (id_product, id_shop, id_lang, name, description, description_short,
         link_rewrite, meta_title, meta_description,
         available_now, available_later, delivery_in_stock, delivery_out_stock)
      VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id_product, id_shop, id_lang) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        description_short = EXCLUDED.description_short,
        link_rewrite = EXCLUDED.link_rewrite,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        delivery_in_stock = EXCLUDED.delivery_in_stock,
        delivery_out_stock = EXCLUDED.delivery_out_stock
    `, [
      productId, langId,
      row.name, row.description, row.description_short,
      row.link_rewrite, row.meta_title, row.meta_description,
      row.available_now, row.available_later,
      row.delivery_in_stock, row.delivery_out_stock,
    ])
  }

  
  
  
  const stats = { categoriesUpdated: 0, combinationsUpdated: 0, combinationsFailed: 0, carriersUpdated: 0 }

  
  
  
  
  
  
  
  
  if (body.stock !== undefined) {
    const qty = Number(body.stock)
    const { affectedRows } = await db.run(`
      UPDATE ps_stock_available
         SET quantity = ?,
             physical_quantity = GREATEST(?, 0) + COALESCE(reserved_quantity, 0)
       WHERE id_product = ? AND id_product_attribute = 0
    `, [qty, qty, productId])
    if (!affectedRows) {
      const phys = Math.max(qty, 0)
      await db.run(`
        INSERT INTO ps_stock_available
          (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
           physical_quantity, reserved_quantity, depends_on_stock, out_of_stock, location)
        VALUES (?, 0, 1, 0, ?, ?, 0, 0, 2, '')
      `, [productId, qty, phys])
    }
  }

  if (Array.isArray(body.categoryIds)) {
    const ids = new Set<number>(
      body.categoryIds.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    )
    if (body.categoryId && Number(body.categoryId) > 0) ids.add(Number(body.categoryId))

    if (ids.size > 0) {
      await db.run(`DELETE FROM ps_category_product WHERE id_product = ?`, [productId])
      for (const catId of ids) {
        await db.run(
          `INSERT INTO ps_category_product (id_category, id_product, position) VALUES (?, ?, 0)`,
          [catId, productId]
        )
        stats.categoriesUpdated++
      }

      
      
      
      
      
      const explicitDefault = Number(body.categoryId) > 2 ? Number(body.categoryId) : 0
      if (!explicitDefault) {
        const orderedReal = (body.categoryIds as any[])
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n) && n > 2)
        const cur = await db.get<{ id_category_default: number }>(
          `SELECT id_category_default FROM ps_product WHERE id_product = ?`, [productId],
        )
        const curDef = Number(cur?.id_category_default) || 0
        if (orderedReal.length && (curDef <= 2 || !ids.has(curDef))) {
          const target = orderedReal[0]
          await db.run(`UPDATE ps_product SET id_category_default = ?, date_upd = NOW() WHERE id_product = ?`, [target, productId])
          await db.run(`UPDATE ps_product_shop SET id_category_default = ? WHERE id_product = ?`, [target, productId]).catch(() => {})
        }
      }
    }
  }

  
  
  
  
  
  if (Array.isArray(body.carrierRefs)) {
    await db.run(`DELETE FROM ps_product_carrier WHERE id_product = ?`, [productId])
    const uniqueRefs = Array.from(new Set(
      body.carrierRefs.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    ))
    for (const ref of uniqueRefs) {
      await db.run(
        `INSERT INTO ps_product_carrier (id_product, id_carrier_reference, id_shop) VALUES (?, ?, 1)`,
        [productId, ref]
      )
      stats.carriersUpdated++
    }
  }

  
  if (Array.isArray(body.combinations)) {
    for (const combo of body.combinations) {
      const comboId = Number(combo?.id)
      if (!Number.isFinite(comboId) || comboId <= 0) continue
      try {
        const paFields: string[] = []
        const paParams: any[] = []
        if (combo.priceImpact !== undefined) { paFields.push('price = ?'); paParams.push(Number(combo.priceImpact) || 0) }
        if (combo.reference !== undefined) { paFields.push('reference = ?'); paParams.push(String(combo.reference || '')) }
        if (paFields.length) {
          await db.run(
            `UPDATE ps_product_attribute SET ${paFields.join(', ')} WHERE id_product_attribute = ? AND id_product = ?`,
            [...paParams, comboId, productId]
          )
        }
        if (combo.quantity !== undefined) {
          await db.run(`
            UPDATE ps_stock_available
               SET quantity = ?,
                   physical_quantity = GREATEST(?, 0) + COALESCE(reserved_quantity, 0)
             WHERE id_product = ? AND id_product_attribute = ?
          `, [Number(combo.quantity) || 0, Number(combo.quantity) || 0, productId, comboId])
        }
        stats.combinationsUpdated++
      } catch (err) {
        console.error('[bo/products PUT] combo update failed', { comboId, err })
        stats.combinationsFailed++
      }
    }
  }

  
  
  if (body.priceDisplayMode !== undefined && tenantHasUnitPricing(event)) {
    const raw = body.priceDisplayMode
    const mode: 'unit' | 'kg' | null = (raw === 'unit' || raw === 'kg') ? raw : null
    try {
      await upsertPriceDisplayMode(productId, mode, { event })
    } catch (err) {
      console.error('[bo/products PUT] upsertPriceDisplayMode failed', { productId, mode, err })
    }
  }

  
  
  
  
  
  let redirects: Array<{ source: string; target: string; action: string }> = []
  if (urlsMayMove) {
    invalidateCategoryPathCache()
    const urlsAfter = await snapshotEntityUrls(db, { event, kind: 'product', ids: [productId] })
    
    
    try {
      redirects = await poseRedirectsForMovedUrls(db, urlsBefore, urlsAfter, 'product')
    } catch (err: any) {
      console.error(`[bo/products/${productId} PUT] 301 non posees:`, err?.message)
    }
  }

  callAction<ActionProductSavedPayload>(HOOKS_ACTION.PRODUCT_SAVED, {
    productId, created: false,
  }).catch((err: any) => {
    console.error(`[bo/products PUT] hook '${HOOKS_ACTION.PRODUCT_SAVED}' failed:`, err?.message)
  })

  return { success: true, stats, langId, isMaster, redirects }
})
