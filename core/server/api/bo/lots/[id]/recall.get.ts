

import { getLotById, listRecallCustomers } from '~/enterprise/vertical-food/lot/server/utils/lot'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const lotInfo = await getLotById(id, { event })
  if (!lotInfo) throw createError({ statusCode: 404, statusMessage: 'Lot introuvable' })

  const { method, customers } = await listRecallCustomers(lotInfo, { event })

  return {
    ok: true,
    method,
    lot: {
      id: lotInfo.idLot,
      lotNumber: lotInfo.lotNumber,
      idProduct: lotInfo.idProduct,
      entryDate: lotInfo.entryDate,
      expiryDate: lotInfo.expiryDate,
    },
    customers,
    total: customers.length,
  }
})
