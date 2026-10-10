

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const statusFilter = q.status ? Number(q.status) : 0
  const customerIdFilter = q.customerId ? Number(q.customerId) : 0
  const sort = q.sort || 'id'
  const dir = q.dir === 'ASC' ? sql.raw('ASC') : sql.raw('DESC')

  
  const fId       = (q.fId       || '').trim()
  const fCustomer = (q.fCustomer || '').trim()
  const fCompany  = (q.fCompany  || '').trim()
  const fStatusCol = q.fStatus ? Number(q.fStatus) : 0
  const fPayment  = (q.fPayment  || '').trim()
  const fTotalMin = Number(q.fTotalMin || 0)
  const fDateFrom = (q.fDateFrom || '').trim()

  const d = usePocPg()

  try {
    const conditions: any[] = []

    if (search) {
      const s = `%${search}%`
      conditions.push(sql`(o.reference ILIKE ${s} OR c.firstname ILIKE ${s} OR c.lastname ILIKE ${s} OR c.email ILIKE ${s} OR c.company ILIKE ${s} OR (o.id_order::text) ILIKE ${s})`)
    }
    if (statusFilter) {
      conditions.push(sql`o.current_state = ${statusFilter}`)
    }
    if (fId) {
      const s = `%${fId}%`
      conditions.push(sql`((o.id_order::text) ILIKE ${s} OR o.reference ILIKE ${s})`)
    }
    if (fCustomer) {
      const s = `%${fCustomer}%`
      conditions.push(sql`(c.firstname ILIKE ${s} OR c.lastname ILIKE ${s} OR c.email ILIKE ${s})`)
    }
    if (fCompany) {
      conditions.push(sql`c.company ILIKE ${`%${fCompany}%`}`)
    }
    if (fStatusCol) {
      conditions.push(sql`o.current_state = ${fStatusCol}`)
    }
    if (fPayment) {
      conditions.push(sql`o.payment ILIKE ${`%${fPayment}%`}`)
    }
    if (fTotalMin > 0) {
      conditions.push(sql`o.total_paid_tax_incl >= ${fTotalMin}`)
    }
    if (fDateFrom) {
      conditions.push(sql`o.date_add >= ${fDateFrom}`)
    }
    if (customerIdFilter > 0) {
      conditions.push(sql`o.id_customer = ${customerIdFilter}`)
    }

    const where = conditions.length
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``

    const countRows: any[] = await d.execute(sql`
      SELECT COUNT(*) AS total
      FROM cs_main.ps_orders o
      LEFT JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      ${where}
    `) as any[]
    const total = Number(countRows?.[0]?.total ?? 0)
    const offset = (page - 1) * perPage

    const sortMap: Record<string, any> = {
      id: sql.raw('o.id_order'),
      customer: sql.raw('c.lastname'),
      total: sql.raw('o.total_paid_tax_incl'),
      date: sql.raw('o.date_add'),
    }
    const sortCol = sortMap[sort] || sortMap.id

    const orders: any[] = await d.execute(sql`
      SELECT
        o.id_order       AS "id",
        o.reference,
        o.id_customer    AS "customerId",
        -- Nom client : ps_customer d'abord, sinon fallback adresse de livraison
        -- (les commandes INVITÉ ont un ps_customer aux firstname/lastname vides ;
        -- le nom saisi vit sur ps_address).
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(c.firstname,''), ' ', COALESCE(c.lastname,''))), ''),
          NULLIF(TRIM(CONCAT(COALESCE(ad.firstname,''), ' ', COALESCE(ad.lastname,''))), ''),
          ''
        )                AS "customerName",
        c.email          AS "customerEmail",
        COALESCE(NULLIF(c.company,''), NULLIF(ad.company,''), '') AS "customerCompany",
        o.current_state  AS "statusId",
        COALESCE(osl.name, CONCAT('État #', o.current_state)) AS status,
        os.color         AS "statusColor",
        o.payment,
        ROUND(o.total_paid_tax_excl::numeric, 2)    AS "totalPaidHT",
        ROUND(o.total_paid_tax_incl::numeric, 2)    AS "totalPaidTTC",
        ROUND(o.total_shipping_tax_incl::numeric, 2) AS "totalShipping",
        o.date_add       AS "dateAdd",
        oi.id_order_invoice AS "invoiceId"
      FROM cs_main.ps_orders o
      LEFT JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN cs_main.ps_address ad ON ad.id_address = o.id_address_delivery
      LEFT JOIN cs_main.ps_order_state os ON os.id_order_state = o.current_state
      LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
      LEFT JOIN cs_main.ps_order_invoice oi ON oi.id_order = o.id_order AND oi.number > 0
      ${where}
      ORDER BY ${sortCol} ${dir}
      LIMIT ${perPage} OFFSET ${offset}
    `) as any[]

    return { orders, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/orders] DB error:', err?.message)
    return { orders: [], total: 0, page, perPage, totalPages: 0 }
  }
})
