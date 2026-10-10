

import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const customerId = Number(id)
  if (!Number.isFinite(customerId) || customerId <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const db = useClientDb(event)

  const customer = await db.get<any>(`
    SELECT
      c.id_customer AS id,
      c.firstname, c.lastname, c.email,
      c.company, c.siret, c.ape, c.website, c.note,
      c.active, c.newsletter, c.optin,
      c.id_default_group AS defaultGroupId,
      c.outstanding_allow_amount AS outstandingAmount,
      c.max_payment_days AS maxPaymentDays,
      c.date_add AS dateAdd,
      c.date_upd AS dateUpd
    FROM ps_customer c
    WHERE c.id_customer = ? AND c.deleted = 0
  `, [customerId])

  if (!customer) throw createError({ statusCode: 404, message: 'Client introuvable' })

  
  
  
  
  
  const addresses = await db.query<any>(`
    SELECT
      a.id_address AS id,
      a.alias,
      a.company,
      a.firstname,
      a.lastname,
      a.address1,
      a.address2,
      a.postcode,
      a.city,
      a.id_country AS countryId,
      a.id_state AS stateId,
      a.phone,
      a.phone_mobile AS phoneMobile,
      a.vat_number AS vatNumber,
      a.date_add AS dateAdd
    FROM ps_address a
    WHERE a.id_customer = ? AND a.deleted = 0 AND a.active = 1
    ORDER BY a.id_address DESC
  `, [customerId])

  const billingAddress = addresses[0] || null

  
  
  const loyaltyAccount = await db.get<{ balance_points: number; total_earned: number; total_spent: number }>(`
    SELECT balance_points, total_earned, total_spent
    FROM cs_loyalty_account
    WHERE id_customer = ?
  `, [customerId])
  const loyalty = {
    balancePoints: Number(loyaltyAccount?.balance_points ?? 0),
    totalEarned: Number(loyaltyAccount?.total_earned ?? 0),
    totalSpent: Number(loyaltyAccount?.total_spent ?? 0),
  }

  
  
  
  
  const groupRows = await db.query<any>(`
    SELECT id_group AS id FROM ps_customer_group WHERE id_customer = ?
  `, [customerId])
  const groupIds = groupRows.map((r: any) => Number(r.id)).filter(Boolean)

  
  const orders = await db.query<any>(`
    SELECT
      o.id_order AS id,
      o.reference,
      o.id_customer AS customerId,
      o.current_state AS statusId,
      os.color AS statusColor,
      osl.name AS statusName,
      o.payment,
      ROUND(o.total_paid_tax_excl, 2) AS totalPaidHT,
      ROUND(o.total_paid_tax_incl, 2) AS totalPaidTTC,
      ROUND(o.total_shipping, 2) AS totalShipping,
      ROUND(o.total_products, 2) AS totalProducts,
      o.date_add AS dateAdd
    FROM ps_orders o
    LEFT JOIN ps_order_state os ON os.id_order_state = o.current_state
    LEFT JOIN ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
    WHERE o.id_customer = ? AND o.valid = 1
    ORDER BY o.id_order DESC
    LIMIT 20
  `, [customerId])

  
  
  
  
  
  
  
  
  
  
  
  const { getCustomerActivityCode } = await import('~/modules/customer-extra/server/utils/customer-extra')
  const { libelleActivite } = await import('~/modules/customer-extra/server/utils/customer-activity')
  const activityCode: string | null = await getCustomerActivityCode(customerId, { event })
  const activityLabel = await libelleActivite(activityCode, await resolveIdLang(event))

  return {
    ...customer,
    billingAddress,
    groupIds,
    addresses,
    orders,
    loyalty,
    extra: {
      activityCode,
      activityLabel,
    },
  }
})
