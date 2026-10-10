

import { useClientDb, useClientDbById } from '~/server/utils/db'

import { requireEmployeeSession } from '~/server/utils/session'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionProductStockChangedPayload } from '~/server/utils/hooks-catalog'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ quantity: number; clientId?: string }>(event)
  const { quantity, clientId } = body || {}
  if (!id || quantity === undefined) {
    throw createError({ statusCode: 400, message: 'id et quantity requis' })
  }

  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  
  
  const prevRow = await db.get<{ quantity: number }>(
    `SELECT quantity FROM ps_stock_available WHERE id_product = ? AND id_product_attribute = 0`,
    [id],
  ).catch(() => null)
  const oldQty = prevRow ? Number(prevRow.quantity) : undefined

  const { affectedRows } = await db.run(
    `UPDATE ps_stock_available
        SET quantity = ?, physical_quantity = ?
      WHERE id_product = ? AND id_product_attribute = 0`,
    [Number(quantity), Number(quantity), id],
  )
  if (!affectedRows) {
    
    await db.run(
      `INSERT INTO ps_stock_available
          (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
           physical_quantity, reserved_quantity, depends_on_stock, out_of_stock, location)
       VALUES (?, 0, 1, 0, ?, ?, 0, 0, 2, '')`,
      [id, Number(quantity), Number(quantity)],
    )
  }

  
  
  callAction<ActionProductStockChangedPayload>(HOOKS_ACTION.PRODUCT_STOCK_CHANGED, {
    productId: id, oldQty, newQty: Number(quantity),
  }).catch((err: any) => {
    console.error(`[bo/products/${id}/stock] hook '${HOOKS_ACTION.PRODUCT_STOCK_CHANGED}' failed:`, err?.message)
  })

  return { success: true }
})
