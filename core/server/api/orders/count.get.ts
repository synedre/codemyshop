

import { useClientDb } from '~/server/utils/db'

const FIRST_ORDER_PROMO_CODE = 'PROMO5'

export default defineEventHandler(async (event) => {
  const { customerId } = getQuery(event) as Record<string, string>
  const idCustomer = Number(customerId)
  if (!idCustomer) throw createError({ statusCode: 400, message: 'customerId requis' })

  const db = useClientDb(event)
  
  
  
  const row = await db.get<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM ps_orders
      WHERE id_customer = ?
        AND current_state NOT IN (6, 8)`,
    [idCustomer],
  )
  const promo = await db.get<{ available: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM ps_cart_rule
        WHERE code = ?
          AND active = 1
          AND quantity > 0
          AND date_from <= NOW()
          AND date_to >= NOW()
     ) AS available`,
    [FIRST_ORDER_PROMO_CODE],
  )
  return { count: Number(row?.count ?? 0), promoAvailable: promo?.available === true }
})
