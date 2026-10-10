

import { useClientDb } from '~/server/utils/db'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const db = useClientDb(event)

  const cart = await db.get<any>(`
    SELECT ca.id_cart AS id, ca.id_customer AS customerId, ca.id_carrier AS carrierId,
           ca.date_add AS dateAdd, ca.date_upd AS dateUpd,
           CASE WHEN ca.id_customer > 0 THEN CONCAT(c.firstname, ' ', c.lastname) ELSE 'Anonyme' END AS customerName,
           c.email AS customerEmail, c.company AS customerCompany,
           (SELECT NULLIF(a.phone, '') FROM ps_address a
             WHERE a.id_customer = ca.id_customer AND a.deleted = 0 AND NULLIF(a.phone, '') IS NOT NULL
             ORDER BY a.id_address DESC LIMIT 1) AS customerPhone,
           (SELECT NULLIF(a.phone_mobile, '') FROM ps_address a
             WHERE a.id_customer = ca.id_customer AND a.deleted = 0 AND NULLIF(a.phone_mobile, '') IS NOT NULL
             ORDER BY a.id_address DESC LIMIT 1) AS customerPhoneMobile
    FROM ps_cart ca
    LEFT JOIN ps_customer c ON c.id_customer = ca.id_customer
    WHERE ca.id_cart = ?
  `, [Number(id)])
  if (!cart) throw createError({ statusCode: 404, message: 'Panier introuvable' })

  const items = await db.query<any>(`
    SELECT cp.id_product AS productId, cp.id_product_attribute AS combinationId,
           cp.quantity,
           COALESCE(pl.name, CONCAT('Produit #', cp.id_product)) AS productName,
           p.reference, p.price AS priceHT,
           ROUND(p.price * (1 + COALESCE(t.rate, 0) / 100), 2) AS priceTTC
    FROM ps_cart_product cp
    JOIN ps_product p ON p.id_product = cp.id_product
    LEFT JOIN ps_product_lang pl ON pl.id_product = cp.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
    LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = p.id_tax_rules_group AND tr.id_country = 8
    LEFT JOIN ps_tax t ON t.id_tax = tr.id_tax
    WHERE cp.id_cart = ?
    ORDER BY pl.name
  `, [Number(id)])

  
  
  
  
  
  const order = await db.get<any>(`
    SELECT o.id_order AS id, o.reference, o.current_state AS statusId,
           ROUND(o.total_paid_tax_incl, 2) AS totalTTC, o.date_add AS dateAdd
    FROM ps_orders o
    JOIN ps_cart ca ON ca.id_cart = o.id_cart
    WHERE o.id_cart = ?
      AND o.id_customer = ca.id_customer
      AND o.date_add >= ca.date_add
    ORDER BY o.date_add ASC LIMIT 1
  `, [Number(id)])

  return { cart, items, order }
})
