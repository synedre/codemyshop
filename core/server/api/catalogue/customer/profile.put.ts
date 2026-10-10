

import { useClientDb } from '~/server/utils/db'
import { requireCustomer, resolveCustomerIdForRequest } from '~/server/utils/customer-session'
import { toIsoDate } from '~/server/utils/pg-date'

export default defineEventHandler(async (event) => {
  
  requireCustomer(event)
  const body = await readBody<Record<string, any>>(event)
  const { customerId, firstname, lastname, company, siret, email, newsletter, birthday } = body || {}
  const resolvedId = resolveCustomerIdForRequest(event, customerId)
  if (!resolvedId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const sets: string[] = []
  const params: any[] = []
  const add = (col: string, val: any) => {
    if (val === undefined) return
    sets.push(`${col} = ?`)
    params.push(val)
  }
  add('firstname', firstname)
  add('lastname', lastname)
  add('company', company)
  add('siret', siret)
  add('email', email)
  add('newsletter', newsletter != null ? (newsletter ? 1 : 0) : undefined)
  
  
  
  if (birthday !== undefined) {
    const value = String(birthday || '').trim()
    if (value === '') {
      add('birthday', null)
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw createError({ statusCode: 400, message: 'birthday attendu au format AAAA-MM-JJ' })
      }
      const parsed = new Date(`${value}T00:00:00Z`)
      const year = Number(value.slice(0, 4))
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() || year < 1900) {
        throw createError({ statusCode: 400, message: 'birthday invalide' })
      }
      add('birthday', value)
    }
  }
  if (!sets.length) throw createError({ statusCode: 400, message: 'aucun champ modifiable' })

  sets.push('date_upd = NOW()')
  params.push(resolvedId)

  const db = useClientDb(event)
  await db.run(
    `UPDATE ps_customer SET ${sets.join(', ')} WHERE id_customer = ? AND deleted = 0`,
    params,
  )

  const updated = await db.get<any>(
    `SELECT id_customer, firstname, lastname, email, company, siret, newsletter, birthday
       FROM ps_customer WHERE id_customer = ? LIMIT 1`,
    [resolvedId],
  )
  if (!updated) throw createError({ statusCode: 404, message: 'Client introuvable' })

  return {
    id: Number(updated.id_customer),
    firstname: String(updated.firstname || ''),
    lastname: String(updated.lastname || ''),
    email: String(updated.email || ''),
    company: String(updated.company || ''),
    siret: String(updated.siret || ''),
    newsletter: Number(updated.newsletter) === 1,
    birthday: toIsoDate(updated.birthday),
  }
})
