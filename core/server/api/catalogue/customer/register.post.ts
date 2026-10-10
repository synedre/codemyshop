

import { getTenantPsConfig } from '~/server/utils/ps-tenant'
import { sendWelcomeEmail } from '~/server/utils/order-emails'
import { useClientDb } from '~/server/utils/db'
import { activiteValide } from '~/modules/customer-extra/server/utils/customer-activity'
import { signToken } from '~/server/utils/session-crypto'
import { rateLimit } from '~/server/utils/redis'
import { verifySiret } from '~/server/utils/siret-verify'
import { enrichSiretAddress } from '~/server/utils/sirene-enrich'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionCustomerRegisteredPayload } from '~/server/utils/hooks-catalog'

export default defineEventHandler(async (event) => {
  
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`register:${ip}`, 5, 600))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de tentatives d\'inscription. Réessayez dans quelques minutes.',
      data: { code: 'TOO_MANY_REGISTRATION_ATTEMPTS' },
    })
  }

  const body = await readBody<{
    firstname: string
    lastname: string
    email: string
    password: string
    phone?: string
    company?: string
    siret?: string
    activityCode?: string
    
    companyInCreation?: boolean
    
    accountType?: 'b2c' | 'pro'
  }>(event)

  const tenant = getTenantPsConfig(event)
  const db = useClientDb(event)

  
  const configRows = await db.query<{ name: string; value: string }>(
    `SELECT name, value FROM ps_configuration WHERE name IN ('CMS_COMMERCE_MODE', 'PS_B2B_ENABLE')`,
  ).catch(() => [])
  const map = Object.fromEntries(configRows.map(r => [r.name, r.value]))
  const cfg = useRuntimeConfig(event)
  const cmsMode = map.CMS_COMMERCE_MODE?.trim()?.toLowerCase()
  let commerceMode: 'b2c' | 'b2b' | 'dual' = 'b2c'
  if (cmsMode === 'dual' || cmsMode === 'b2b' || cmsMode === 'b2c') {
    commerceMode = cmsMode as any
  } else if (map.PS_B2B_ENABLE === '1') {
    commerceMode = 'b2b'
  } else if ((cfg.public as any).commerceMode && ['b2c', 'b2b', 'dual'].includes((cfg.public as any).commerceMode)) {
    commerceMode = (cfg.public as any).commerceMode
  } else if ((cfg.public as any).b2bMode === true) {
    commerceMode = 'b2b'
  }

  
  
  
  
  const isProSignup = commerceMode === 'b2b' || (commerceMode === 'dual' && (body.accountType === 'pro' || !!body.company?.trim()))
  const isB2b = isProSignup

  
  if (!body.email || !body.password || !body.firstname || !body.lastname) {
    throw createError({ statusCode: 422, message: 'Champs requis : email, password, firstname, lastname' })
  }

  
  
  
  const emailNorm = String(body.email).trim().toLowerCase()

  let siretRaw = ''
  if (isB2b) {
    
    if (!body.company) {
      throw createError({ statusCode: 422, message: 'Champs requis : company' })
    }

    if (body.companyInCreation) {
      
      
      console.info(`[register:${tenant.clientId}] companyInCreation=true — SIRET validation bypassed for "${body.company}"`)
    } else {
      
      
      siretRaw = (body.siret || '').replace(/\D/g, '')
      if (!siretRaw) {
        throw createError({ statusCode: 422, message: 'Le numéro SIRET est obligatoire (14 chiffres).' })
      }
      if (siretRaw.length !== 14) {
        throw createError({ statusCode: 422, message: 'Le SIRET doit contenir 14 chiffres.' })
      }
      const siretCheck = await verifySiret(siretRaw)
      if (!siretCheck.valid) {
        const isNetworkErr = (siretCheck.error || '').includes('indisponible')
        if (!isNetworkErr) {
          throw createError({
            statusCode: 422,
            message: siretCheck.error || 'Ce SIRET ne correspond à aucun établissement actif.',
          })
        }
        console.warn(`[register] SIRET check soft-fail (network): ${siretCheck.error} — siret=${siretRaw}`)
      }
    }
  }

  
  
  
  
  
  
  const existing = await db.get<{ id_customer: number }>(
    `SELECT id_customer FROM ps_customer WHERE LOWER(email) = ? AND deleted = 0 LIMIT 1`,
    [emailNorm],
  )
  if (existing) {
    throw createError({ statusCode: 409, message: 'Un compte existe déjà avec cet email.' })
  }

  
  const bcrypt = await import('bcryptjs')
  const hashed = (await bcrypt.hash(body.password, 10)).replace(/^\$2a\$/, '$2y$')

  
  const { createHash, randomBytes } = await import('node:crypto')
  const secureKey = createHash('md5').update(randomBytes(16)).digest('hex')

  
  const company = isB2b ? (body.company || '') : ''
  const phoneRaw = (body.phone || '').trim().slice(0, 32)
  const { insertId } = await db.run(
    `INSERT INTO ps_customer
        (id_shop_group, id_shop, id_gender, id_default_group, id_lang,
         firstname, lastname, email, passwd, company, siret, phone, secure_key,
         active, newsletter, optin, is_guest, deleted, date_add, date_upd)
     VALUES (1, 1, 1, 3, 1, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, NOW(), NOW())`,
    [body.firstname, body.lastname, emailNorm, hashed, company, siretRaw, phoneRaw, secureKey],
  )
  const customerId = Number(insertId)

  
  
  
  callAction<ActionCustomerRegisteredPayload>(HOOKS_ACTION.CUSTOMER_REGISTERED, {
    customerId,
    email: body.email,
  }).catch((err: any) => {
    console.error(`[register:${tenant.clientId}] hook '${HOOKS_ACTION.CUSTOMER_REGISTERED}' failed:`, err?.message)
  })

  
  await db.run(
    `INSERT IGNORE INTO ps_customer_group (id_customer, id_group) VALUES (?, 3)`,
    [customerId],
  )

  
  
  
  
  
  
  if (isB2b && body.activityCode && await activiteValide(body.activityCode)) {
    try {
      const { upsertCustomerActivityCodeGraceful } = await import('~/modules/customer-extra/server/utils/customer-extra')
      await upsertCustomerActivityCodeGraceful(customerId, body.activityCode, { event })
    } catch (err: any) {
      console.warn(`[register:${tenant.clientId}] ac_customer_extra seed error:`, err?.message)
    }
  }

  
  
  
  
  if (isB2b && siretRaw) {
    try {
      const r = await enrichSiretAddress(db, customerId, siretRaw, {
        firstname: body.firstname,
        lastname: body.lastname,
        email: body.email,
      })
      if (!r.enriched && r.reason !== 'adresse company-non-vide déjà présente') {
        console.warn(`[register:${tenant.clientId}] sirene enrich skipped: ${r.reason}`)
      }
    } catch (err: any) {
      console.warn(`[register:${tenant.clientId}] sirene enrich error:`, err?.message)
    }
  }

  
  const session = {
    customerId,
    email: body.email,
    firstname: body.firstname,
    lastname: body.lastname,
    company,
    userType: 'customer' as const,
  }
  const token = signToken(session)
  const maxAge = 60 * 60 * 24 * 30
  setCookie(event, 'ac_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  
  const shopRow = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`,
  ).catch(() => null)
  const urlRow = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_DOMAIN' LIMIT 1`,
  ).catch(() => null)
  const shopName = shopRow?.value || 'Boutique'
  const shopUrl = urlRow?.value ? `https://${urlRow.value}` : '/'
  sendWelcomeEmail(body.email, body.firstname, company, shopName, shopUrl)
    .catch((e: any) => console.error(`[register:${tenant.clientId}] Email bienvenue échoué:`, e?.message))

  
  
  
  let sfSyncNote: string | undefined
  try {
    const { syncLead } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-sync')
    const { enqueueSfOutbox } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-outbox')
    const { mapIndustry, loadIndustryMapping } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-mapping')
    
    
    
    
    
    
    const industryMapping = await loadIndustryMapping()
    const industry = body.activityCode ? mapIndustry(body.activityCode, industryMapping) : undefined
    const sfInput = {
      firstName: body.firstname,
      lastName: body.lastname,
      email: body.email,
      
      company: company || `${body.firstname} ${body.lastname}`,
      siret: siretRaw || undefined,
      industry,
      leadSource: 'Site web' as const,
      mode: 'realtime' as const,
    }
    const sfResult = await syncLead(sfInput)
    if (sfResult.status === 'failed') {
      await enqueueSfOutbox(sfInput)
      sfSyncNote = 'Votre inscription est en cours de synchronisation avec Salesforce.'
      console.warn(`[register:${tenant.clientId}] SF sync failed (enqueued) — ${sfResult.errorMessage}`)
    } else if (sfResult.status !== 'disabled') {
      console.log(`[register:${tenant.clientId}] SF sync ${sfResult.status} sfId=${('sfId' in sfResult ? sfResult.sfId : '') ?? ''} (${sfResult.durationMs}ms)`)
    }
  } catch (sfErr: any) {
    
    if (!sfErr?.message?.includes('Cannot find module') && !sfErr?.message?.includes('Failed to resolve')) {
      console.warn(`[register:${tenant.clientId}] SF sync error:`, sfErr?.message)
    }
  }

  return { success: true, customer: session, ...(sfSyncNote ? { sfSyncNote } : {}) }
})
