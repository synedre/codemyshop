

import { useClientDb } from '~/server/utils/db'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const sort = q.sort || 'id'
  const dir = q.dir === 'ASC' ? 'ASC' : 'DESC'

  
  const fId            = (q.fId        || '').trim()
  const fCustomer      = (q.fCustomer  || '').trim()
  const fEmail         = (q.fEmail     || '').trim()
  const fItemsMin      = Number(q.fItemsMin || 0)
  const fConverted     = q.fConverted === '1' ? '1' : (q.fConverted === '0' ? '0' : '')
  const fDateFrom      = (q.fDateFrom  || '').trim()
  const fOrderedBefore = q.fOrderedBefore === '1' ? '1' : (q.fOrderedBefore === '0' ? '0' : '')

  const db = useClientDb(event)

  try {
    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      conditions.push(`(c.firstname ILIKE ? OR c.lastname ILIKE ? OR c.email ILIKE ? OR c.company ILIKE ?)`)
      const s = `%${search}%`
      params.push(s, s, s, s)
    }
    if (fId) {
      conditions.push(`CAST(ca.id_cart AS TEXT) ILIKE ?`)
      params.push(`%${fId}%`)
    }
    if (fCustomer) {
      conditions.push(`(c.firstname ILIKE ? OR c.lastname ILIKE ?)`)
      const s = `%${fCustomer}%`
      params.push(s, s)
    }
    if (fEmail) {
      conditions.push(`c.email ILIKE ?`)
      params.push(`%${fEmail}%`)
    }
    
    
    if (fConverted === '1') {
      conditions.push(`EXISTS (SELECT 1 FROM ps_orders o WHERE o.id_cart = ca.id_cart AND o.id_customer = ca.id_customer AND o.date_add >= ca.date_add)`)
    } else if (fConverted === '0') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM ps_orders o WHERE o.id_cart = ca.id_cart AND o.id_customer = ca.id_customer AND o.date_add >= ca.date_add)`)
    }
    if (fOrderedBefore === '1') {
      conditions.push(`(ca.id_customer > 0 AND EXISTS (SELECT 1 FROM ps_orders oc WHERE oc.id_customer = ca.id_customer))`)
    } else if (fOrderedBefore === '0') {
      conditions.push(`(ca.id_customer = 0 OR NOT EXISTS (SELECT 1 FROM ps_orders oc WHERE oc.id_customer = ca.id_customer))`)
    }
    if (fDateFrom) {
      conditions.push(`ca.date_add >= ?`)
      params.push(fDateFrom)
    }

    
    
    
    
    
    
    const having = fItemsMin > 0
      ? `HAVING COUNT(cp.id_product) >= ${fItemsMin}`
      : 'HAVING COUNT(cp.id_product) > 0'
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = await db.get<any>(`
      SELECT COUNT(*) AS total FROM (
        SELECT ca.id_cart, COUNT(cp.id_product) AS nbItems
        FROM ps_cart ca
        JOIN ps_cart_product cp ON cp.id_cart = ca.id_cart
        LEFT JOIN ps_customer c ON c.id_customer = ca.id_customer
        ${where}
        GROUP BY ca.id_cart
        ${having}
      ) sub
    `, params)

    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    const sortMap: Record<string, string> = { id: 'ca.id_cart', date: 'ca.date_add' }
    const orderClause = `ORDER BY ${sortMap[sort] || 'ca.id_cart'} ${dir}`

    
    
    
    
    const carts = await db.query<any>(`
      SELECT
        ca.id_cart       AS id,
        ca.id_customer   AS customerId,
        CASE WHEN ca.id_customer > 0 THEN CONCAT(c.firstname, ' ', c.lastname) ELSE 'Anonyme' END AS customerName,
        c.email          AS customerEmail,
        (SELECT COALESCE(NULLIF(a.phone_mobile, ''), NULLIF(a.phone, ''))
           FROM ps_address a
          WHERE a.id_customer = ca.id_customer AND a.deleted = 0
            AND (NULLIF(a.phone_mobile, '') IS NOT NULL OR NULLIF(a.phone, '') IS NOT NULL)
          ORDER BY a.id_address DESC LIMIT 1) AS customerPhone,
        COUNT(cp.id_product) AS nbItems,
        COALESCE(SUM(cp.quantity), 0) AS totalProducts,
        ca.date_add      AS dateAdd,
        ca.date_upd      AS dateUpd,
        (SELECT COUNT(*) FROM ps_orders o WHERE o.id_cart = ca.id_cart AND o.id_customer = ca.id_customer AND o.date_add >= ca.date_add) AS hasOrder,
        CASE WHEN ca.id_customer > 0 AND EXISTS (
          SELECT 1 FROM ps_orders oc WHERE oc.id_customer = ca.id_customer
        ) THEN 1 ELSE 0 END AS hasOrderedBefore,
        (SELECT COUNT(*) FROM cs_cart_recovery r WHERE r.id_cart = ca.id_cart) AS recoveriesCount
      FROM ps_cart ca
      JOIN ps_cart_product cp ON cp.id_cart = ca.id_cart
      LEFT JOIN ps_customer c ON c.id_customer = ca.id_customer
      ${where}
      GROUP BY ca.id_cart, c.id_customer, c.firstname, c.lastname, c.email
      ${having}
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, perPage, offset])

    return { carts, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/carts] DB error:', err?.message)
    return { carts: [], total: 0, page, perPage, totalPages: 0 }
  }
})
