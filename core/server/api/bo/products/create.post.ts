

import { useClientDb, useClientDbById } from '~/server/utils/db'

import { requireEmployeeSession } from '~/server/utils/session'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionProductSavedPayload } from '~/server/utils/hooks-catalog'
import { traduireVersLanguesActives } from '~/server/utils/traduction-creation-db'
import { slugDe } from '~/server/utils/traduction-creation'
function slugify(s: string): string {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const body = await readBody<any>(event)
  const { clientId, ...data } = body || {}
  if (!data.name) throw createError({ statusCode: 400, message: 'name requis' })

  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)
  
  
  
  
  let categoryId = Number(data.categoryId || 0)
  if (!categoryId) {
    const cfg = await db.get<{ value: string }>(
      `SELECT value FROM ps_configuration WHERE name = 'PS_DEFAULT_NEW_PRODUCT_CATEGORY' LIMIT 1`,
    )
    categoryId = Number(cfg?.value) || 0
    if (categoryId <= 2) {
      const dyn = await db.get<{ id_category: number }>(
        `SELECT id_category FROM ps_category WHERE level_depth >= 2 AND active = 1 ORDER BY id_category ASC LIMIT 1`,
      )
      categoryId = dyn?.id_category ?? 2
    }
  }
  const taxRulesGroupId = Number(data.taxRulesGroupId || 1)
  const active = data.active !== false ? 1 : 0
  const price = Number(data.price || 0)
  const weight = Number(data.weight || 0)
  const reference = String(data.reference || '')
  const name = String(data.name || '')
  const description = String(data.description || '')
  const descriptionShort = String(data.descriptionShort || '')
  const slug = slugify(name)
  let langues: Awaited<ReturnType<typeof traduireVersLanguesActives>> = { traduites: new Map(), nonTraduites: [] }

  try {
    const { insertId } = await db.run(
      `INSERT INTO ps_product
          (id_category_default, id_tax_rules_group, id_shop_default, reference, price,
           weight, active, state, visibility, indexed, date_add, date_upd)
       VALUES (?, ?, 1, ?, ?, ?, ?, 1, 'both', 0, NOW(), NOW())`,
      [categoryId, taxRulesGroupId, reference, price, weight, active],
    )
    const productId = Number(insertId)

    await db.run(
      `INSERT INTO ps_product_shop
          (id_product, id_shop, id_category_default, id_tax_rules_group, price, active,
           visibility, indexed, date_add, date_upd)
       VALUES (?, 1, ?, ?, ?, ?, 'both', 0, NOW(), NOW())`,
      [productId, categoryId, taxRulesGroupId, price, active],
    )

    await db.run(
      `INSERT INTO ps_product_lang
          (id_product, id_shop, id_lang, description, description_short, link_rewrite,
           name, meta_description, meta_title, available_now, available_later)
       VALUES (?, 1, 1, ?, ?, ?, ?, '', ?, '', '')`,
      [productId, description, descriptionShort, slug, name, name],
    )

    
    
    
    const lignesLangues = await db.query<{ id_lang: number; iso_code: string; active: number }>(
      `SELECT id_lang, iso_code, active FROM ps_lang`,
    )
    langues = await traduireVersLanguesActives(
      { name, description_short: descriptionShort, description },
      { maxTokens: 2000, lignesLangues },
    )
    for (const [idLang, champs] of langues.traduites) {
      const nomLangue = String(champs.name)
      const slugLangue = slugDe(nomLangue)
      if (!slugLangue) continue 
      await db.run(
        `INSERT INTO ps_product_lang
            (id_product, id_shop, id_lang, description, description_short, link_rewrite,
             name, meta_description, meta_title, available_now, available_later)
         VALUES (?, 1, ?, ?, ?, ?, ?, '', ?, '', '')`,
        [productId, idLang, champs.description ?? '', champs.description_short ?? '', slugLangue, nomLangue, nomLangue],
      )
    }

    
    await db.run(
      `INSERT IGNORE INTO ps_category_product (id_category, id_product, position)
       VALUES (?, ?, 0)`,
      [categoryId, productId],
    )

    
    const initQty = Number(data.quantity || 0)
    await db.run(
      `INSERT INTO ps_stock_available
          (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
           physical_quantity, reserved_quantity, depends_on_stock, out_of_stock, location)
       VALUES (?, 0, 1, 0, ?, ?, 0, 0, 2, '')`,
      [productId, initQty, initQty],
    )

    callAction<ActionProductSavedPayload>(HOOKS_ACTION.PRODUCT_SAVED, {
      productId, created: true,
    }).catch((err: any) => {
      console.error(`[bo/products/create] hook '${HOOKS_ACTION.PRODUCT_SAVED}' failed:`, err?.message)
    })

    return {
      id: productId,
      langues: { traduites: [...langues.traduites.keys()], nonTraduites: langues.nonTraduites },
    }
  } catch (err: any) {
    console.error('[bo/products/create] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Impossible de créer le produit' })
  }
})
