

import {
  countLeadsUnified,
  listLeadsUnified,
  type CustomerType,
} from '~/enterprise/base/smartlead/server/utils/smartlead'

import { requireEmployeeSession } from '~/server/utils/session'

const VALID_CT: CustomerType[] = ['prospect', 'customer', 'user']

function customerTypeToKind(ct: string): 'lead' | 'customer-noorder' | 'contact' {
  if (ct === 'contact') return 'contact'
  if (ct === 'user') return 'customer-noorder'
  return 'lead'  
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim() || undefined
  const sort = (q.sort || '').trim() || undefined
  const dir = q.dir === 'asc' ? 'asc' : q.dir === 'desc' ? 'desc' : undefined

  
  let customerTypes: CustomerType[] | undefined
  let withContacts = true
  const rawCT = (q.customerType || q.customer_type || '').trim()
  if (rawCT) {
    customerTypes = rawCT.split(',').map(s => s.trim()).filter(s => VALID_CT.includes(s as CustomerType)) as CustomerType[]
    
    withContacts = rawCT.split(',').map(s => s.trim()).includes('contact')
  } else {
    const sourceLegacy = q.source
    if (sourceLegacy === 'lead') {
      customerTypes = ['prospect', 'customer', 'user']
      withContacts = false
    } else if (sourceLegacy === 'contact') {
      customerTypes = []  
      withContacts = true
    }
    
  }

  const colFilters = {
    fName:        (q.fName || '').trim() || undefined,
    fProfession:  (q.fProfession || '').trim() || undefined,
    fCompany:     (q.fCompany || '').trim() || undefined,
    fActivite:    (q.fActivite || '').trim() || undefined,
    fCity:        (q.fCity || '').trim() || undefined,
    fWebsite:     (q.fWebsite || '').trim() || undefined,
    fEmail:       (q.fEmail || '').trim() || undefined,
    fPhone:       (q.fPhone || '').trim() || undefined,
    fCaMin:       q.fCaMin ? Number(q.fCaMin) : undefined,
    fEmailVerified: (q.fEmailVerified || '').trim() || undefined,
    
    
    fOrderedBefore: q.fOrderedBefore === '1' ? '1' : q.fOrderedBefore === 'all' ? undefined : '0',
  } as Record<string, any>

  try {
    const total = await countLeadsUnified(
      { search, customerTypes, withContacts, ...colFilters },
      { event },
    )
    const offset = (page - 1) * perPage
    const leads = await listLeadsUnified(
      { search, customerTypes, withContacts, sort, dir, perPage, offset, ...colFilters },
      { event },
    )
    
    const leadsWithKind = leads.map((l: any) => ({
      ...l,
      kind: customerTypeToKind(String(l.source || '')),
    }))
    return { leads: leadsWithKind, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/leads] DB error:', err?.message)
    return { leads: [], total: 0, page, perPage, totalPages: 0 }
  }
})
