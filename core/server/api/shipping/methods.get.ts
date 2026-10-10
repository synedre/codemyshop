

import { getCarriersFromDb } from '~/server/utils/orders-db'
import { resolveIdLang } from '~/server/utils/lang'
import { isMissingTable } from '~/server/utils/missing-table'
import { getCustomerSession } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const { clientId, addressId, countryId, totalHT, weight } = getQuery(event) as {
    clientId?: string; addressId?: string; countryId?: string; totalHT?: string; weight?: string
  }
  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const idLang = await resolveIdLang(event)
  
  
  try {
    return await getCarriersFromDb(idLang, {
      addressId: addressId ? Number(addressId) : undefined,
      countryId: countryId ? Number(countryId) : undefined,
      totalHT: totalHT ? Number(totalHT) : undefined,
      weight: weight ? Number(weight) : undefined,
      
      
      
      customerId: getCustomerSession(event)?.customerId ?? undefined,
    }, ctx)
  } catch (err: any) {
    if (!isMissingTable(err)) throw err
    console.warn('[shipping/methods] tables transporteurs absentes sur ce tenant → []')
    return []
  }
})
