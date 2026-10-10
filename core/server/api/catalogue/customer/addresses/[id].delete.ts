

import { useClientDb } from '~/server/utils/db'
import { requireCustomer, resolveCustomerIdForRequest } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  
  
  
  
  requireCustomer(event)
  const customerId = resolveCustomerIdForRequest(event)
  if (!customerId) throw createError({ statusCode: 401, message: 'Connexion requise' })

  const db = useClientDb(event)
  
  
  const { affectedRows } = await db.run(
    `UPDATE ps_address SET deleted = 1, date_upd = NOW()
      WHERE id_address = ? AND id_customer = ?`,
    [id, customerId],
  )
  
  
  if (!affectedRows) throw createError({ statusCode: 404, message: 'Adresse introuvable' })

  
  
  await db.run(
    `UPDATE ps_customer SET id_address_invoice_default = NULL
      WHERE id_address_invoice_default = ? AND id_customer = ?`,
    [id, customerId],
  )

  return { ok: true, id }
})
