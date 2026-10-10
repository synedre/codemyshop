

import { createHash } from 'node:crypto'
import { useClientDb } from '~/server/utils/db'
import { getTenantPsConfig } from '~/server/utils/ps-tenant'
import { signToken } from '~/server/utils/session-crypto'
import { setHubSessionCookie } from '~/server/utils/session'
import { rateLimit } from '~/server/utils/redis'

const LOGIN_WINDOW_SEC = 600

const LOGIN_MAX_PER_IP = 15

const LOGIN_MAX_PER_EMAIL = 8

function psqlEscape(s: string): string {
  let out = s.replace(/[\0\n\r\x1a\\'"]/g, (m) => {
    switch (m) {
      case '\0': return '\\0'
      case '\n': return '\\n'
      case '\r': return '\\r'
      case '\x1a': return '\\Z'
      case '\\': return '\\\\'
      case "'": return "\\'"
      case '"': return '\\"'
    }
    return m
  })
  return out.replace(/<[^>]*>/g, '')
}

interface CustomerRow {
  id_customer: number
  email: string
  firstname: string
  lastname: string
  company: string
  passwd: string
  active: number
}

interface EmployeeRow {
  id_employee: number
  email: string
  firstname: string
  lastname: string
  passwd: string
  active: number
  id_profile: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event).catch(() => null)

  if (!body || !body.email || !body.password) {
    throw createError({ statusCode: 422, message: 'Email et mot de passe requis' })
  }

  const tenant = getTenantPsConfig(event)
  const db = useClientDb(event)

  
  const emailNorm = String(body.email).trim().toLowerCase()

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const withinQuota =
    (await rateLimit(`customer-login-ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_SEC)) &&
    (await rateLimit(`customer-login-email:${emailNorm}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_SEC))
  if (!withinQuota) {
    throw createError({ statusCode: 429, message: 'Trop de tentatives, réessayez dans quelques minutes' })
  }

  
  
  
  
  
  
  async function verifyPassword(plain: string, storedHash: string): Promise<{ ok: boolean; algo: 'bcrypt' | 'md5' | 'md5_psql' | null }> {
    if (!storedHash) return { ok: false, algo: null }
    if (/^\$2[yab]\$/.test(storedHash)) {
      try {
        const bcrypt = await import('bcryptjs')
        const ok = await bcrypt.compare(plain, storedHash.replace(/^\$2y\$/, '$2a$'))
        return { ok, algo: 'bcrypt' }
      } catch {
        return { ok: false, algo: 'bcrypt' }
      }
    }
    if (createHash('md5').update(tenant.cookieKey + plain).digest('hex') === storedHash) {
      return { ok: true, algo: 'md5' }
    }
    if (createHash('md5').update(psqlEscape(tenant.cookieKey + plain)).digest('hex') === storedHash) {
      return { ok: true, algo: 'md5_psql' }
    }
    return { ok: false, algo: 'md5' }
  }

  
  
  
  async function rehashToBcrypt(plain: string, idCustomerOrEmployee: number, table: 'ps_customer' | 'ps_employee') {
    try {
      const bcrypt = await import('bcryptjs')
      const hashed = (await bcrypt.hash(plain, 10)).replace(/^\$2a\$/, '$2y$')
      const idCol = table === 'ps_customer' ? 'id_customer' : 'id_employee'
      await db.run(`UPDATE ${table} SET passwd = ?, last_passwd_gen = NOW() WHERE ${idCol} = ?`, [hashed, idCustomerOrEmployee])
    } catch (err: any) {
      console.error(`[login:rehash] ${table}#${idCustomerOrEmployee} KO:`, err?.message || err)
    }
  }

  function setSessionCookie(payload: object) {
    const token = signToken(payload)
    const maxAge = 60 * 60 * 24 * 30
    setCookie(event, 'ac_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const candidates = await db.query<CustomerRow>(
    `SELECT id_customer, email, firstname, lastname, IFNULL(company, '') AS company,
            passwd, active
       FROM ps_customer
      WHERE LOWER(email) = ? AND deleted = 0
      ORDER BY id_customer
      LIMIT 5`,
    [emailNorm],
  )

  let customer: CustomerRow | null = null
  let v: { ok: boolean; algo: 'bcrypt' | 'md5' | 'md5_psql' | null } = { ok: false, algo: null }
  for (const row of candidates) {
    const attempt = await verifyPassword(body.password, row.passwd)
    if (attempt.ok) {
      customer = row
      v = attempt
      break
    }
  }

  if (customer) {
    if (Number(customer.active) !== 1) {
      throw createError({ statusCode: 403, message: 'Compte désactivé. Contactez-nous.' })
    }
    if (v.algo === 'md5' || v.algo === 'md5_psql') {
      await rehashToBcrypt(body.password, customer.id_customer, 'ps_customer')
    }
    const session = {
      customerId: customer.id_customer,
      email: customer.email,
      firstname: customer.firstname,
      lastname: customer.lastname,
      company: customer.company,
      userType: 'customer' as const,
    }
    setSessionCookie(session)
    
    
    
    
    
    
    const isAdmin = await grantHubIfAdminEmployee()
    return isAdmin ? { success: true, customer: session, isAdmin } : { success: true, customer: session }
  }

  
  
  function setHubSession(e: EmployeeRow) {
    setHubSessionCookie(event, {
      employeeId: e.id_employee,
      email: e.email,
      firstname: e.firstname,
      lastname: e.lastname,
      role: e.id_profile === 1 ? 'owner' : 'developer',
      profileId: e.id_profile,
      clientId: tenant.clientId,
      userType: 'employee',
      isAdmin: true,
    })
  }

  async function grantHubIfAdminEmployee(): Promise<boolean> {
    const e = await db.get<EmployeeRow>(
      `SELECT id_employee, email, firstname, lastname, passwd, active, id_profile
         FROM ps_employee
        WHERE LOWER(email) = ?
        LIMIT 1`,
      [emailNorm],
    )
    if (!e || Number(e.active) !== 1 || Number(e.id_profile) !== 1) return false
    const ok = await verifyPassword(body.password, e.passwd)
    if (!ok.ok) return false
    setHubSession(e)
    return true
  }

  
  
  
  const emp = await db.get<EmployeeRow>(
    `SELECT id_employee, email, firstname, lastname, passwd, active, id_profile
       FROM ps_employee
      WHERE LOWER(email) = ?
      LIMIT 1`,
    [emailNorm],
  )

  const empVerif = emp ? await verifyPassword(body.password, emp.passwd) : null
  if (emp && empVerif?.ok && Number(emp.active) === 1) {
    if (empVerif.algo === 'md5' || empVerif.algo === 'md5_psql') {
      await rehashToBcrypt(body.password, emp.id_employee, 'ps_employee')
    }
    const session = {
      customerId: emp.id_employee,
      email: emp.email,
      firstname: emp.firstname,
      lastname: emp.lastname,
      company: '',
      userType: 'employee' as const,
      profileId: emp.id_profile,
      isAdmin: emp.id_profile === 1,
    }
    setSessionCookie(session)
    if (session.isAdmin) setHubSession(emp)
    return { success: true, customer: session, isAdmin: session.isAdmin }
  }

  throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect.' })
})
