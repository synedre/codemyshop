

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'
import {
  normalizeCreateInput,
  buildScopedInsert,
  SpecificPriceInputError,
  type CreateInput,
} from '~/server/utils/promotion-scope'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const body = await readBody<CreateInput>(event)

  
  
  let input
  try {
    input = normalizeCreateInput(body)
  } catch (err: any) {
    if (err instanceof SpecificPriceInputError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }

  const db = useClientDb(event)

  if (input.mode === 'product') {
    const idProduct = input.idProduct as number
    const exists = await db.get<{ id_product: number }>(
      `SELECT id_product FROM ps_product WHERE id_product = ? AND active = 1 LIMIT 1`,
      [idProduct],
    )
    if (!exists) throw createError({ statusCode: 404, statusMessage: 'Produit introuvable ou inactif' })

    const res = await db.run(
      `INSERT INTO ps_specific_price (
         id_specific_price_rule, id_cart, id_product, id_shop, id_shop_group,
         id_currency, id_country, id_group, id_customer, id_product_attribute,
         price, from_quantity, reduction, reduction_tax, reduction_type,
         \`from\`, \`to\`
       ) VALUES (0, 0, ?, 1, 0, 0, 0, ?, 0, 0, -1, ?, ?, ?, ?, ?, ?)`,
      [idProduct, input.idGroup, input.fromQuantity, input.reduction,
       input.reductionTax, input.reductionType, input.dateFrom, input.dateTo],
    )
    return {
      ok: true,
      mode: input.mode,
      created: 1,
      skipped: 0,
      targeted: 1,
      ids: res.insertId ? [res.insertId] : [],
    }
  }

  
  const stmt = buildScopedInsert(input)

  const targetRows = await db.query<{ total: number }>(stmt.targetsSql, stmt.targetsParams)
  const targeted = Number(targetRows[0]?.total ?? 0)
  if (!targeted) {
    return {
      ok: true,
      mode: input.mode,
      created: 0,
      skipped: 0,
      targeted: 0,
      ids: [],
      ...(input.mode === 'category' ? { idCategory: input.idCategory } : {}),
    }
  }

  
  
  const inserted = await db.query<{ id_specific_price: number }>(stmt.insertSql, stmt.insertParams)
  const ids = inserted.map((r) => Number(r.id_specific_price)).filter(Boolean)
  const created = ids.length

  return {
    ok: true,
    mode: input.mode,
    created,
    skipped: Math.max(targeted - created, 0),
    targeted,
    ids,
    ...(input.mode === 'category' ? { idCategory: input.idCategory } : {}),
  }
})
