

import { insertContactMessage } from '~/modules/headlesscontact/server/utils/headlesscontact'

import { verifySiret } from '~/server/utils/siret-verify'
import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'
import { getShopConfig } from '~/server/utils/shop-config'
import { sendAdminContactFormEmail } from '~/server/utils/order-emails'
import { resolveAdAttribution } from '~/server/utils/ad-attribution'
import { composeContactMessage } from '~/server/utils/contact-message'
import { sendContactAckEmail } from '~/server/utils/contact-ack'
import { syncContactMessageToCrm } from '~/server/utils/crm-contact-message'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const company = String(body?.company ?? '').trim().slice(0, 200)
  const name    = String(body?.name    ?? '').trim().slice(0, 200)
  const email   = String(body?.email   ?? '').trim().slice(0, 200)
  const phone   = String(body?.phone   ?? '').trim().slice(0, 50)
  const message = String(body?.message ?? '').trim().slice(0, 5000)
  const siret   = String(body?.siret   ?? '').replace(/\D/g, '').slice(0, 14)
  
  const noSiret = body?.noSiret === true
  
  
  
  
  const role    = String(body?.role    ?? '').trim().slice(0, 150)
  const context = String(body?.context ?? '').trim().slice(0, 200)

  
  
  const configRows = await useClientDb(event).query<{ name: string; value: string }>(
    `SELECT name, value FROM ps_configuration WHERE name IN ('CMS_COMMERCE_MODE', 'PS_B2B_ENABLE')`,
  ).catch(() => [])
  const map = Object.fromEntries(configRows.map(r => [r.name, r.value]))
  const cmsMode = map.CMS_COMMERCE_MODE?.trim()?.toLowerCase()
  let isStrictB2b = false
  if (cmsMode === 'b2b') {
    isStrictB2b = true
  } else if (cmsMode === 'dual' || cmsMode === 'b2c') {
    isStrictB2b = false
  } else if (map.PS_B2B_ENABLE === '1') {
    isStrictB2b = true
  } else if (!map.PS_B2B_ENABLE && (useRuntimeConfig(event).public as any)?.b2bMode === true && (useRuntimeConfig(event).public as any)?.commerceMode !== 'dual') {
    isStrictB2b = true
  }
  const siretExempt = noSiret || !isStrictB2b

  if (!name || !email || !message || (!siretExempt && !siret)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Champs requis manquants : nom, email, message' + (siretExempt ? '' : ', SIRET'),
      data: { code: 'MISSING_REQUIRED_FIELDS' },
    })
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'Email invalide', data: { code: 'INVALID_EMAIL' } })
  }
  if (!siretExempt && siret.length !== 14) {
    throw createError({ statusCode: 422, statusMessage: 'SIRET invalide (14 chiffres requis)', data: { code: 'INVALID_SIRET' } })
  }
  if (message.length < 10) {
    throw createError({ statusCode: 422, statusMessage: 'Message trop court (10 caractères minimum)', data: { code: 'MESSAGE_TOO_SHORT' } })
  }

  if (!siretExempt) {
    const siretCheck = await verifySiret(siret)
    if (!siretCheck.valid) {
      throw createError({
        statusCode: 422,
        statusMessage: siretCheck.error || 'SIRET introuvable au registre des entreprises',
        data: { code: 'SIRET_NOT_FOUND' },
      })
    }
  }

  const shop = await getShopConfig(event).catch(() => null)
  const emailCheck = await verifyEmailViaSmtp(email, {
    heloDomain: shop?.shopDomain || undefined,
    mailFrom:   shop?.shopEmail  || undefined,
  })
  
  

  const ip = (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket?.remoteAddress
    || ''
  ).slice(0, 45)
  const userAgent = (getRequestHeader(event, 'user-agent') || '').slice(0, 500)

  
  
  
  
  
  
  const attribution = resolveAdAttribution(event, body?.attribution)

  
  
  const finalMessage = composeContactMessage(message, role, context)

  try {
    const id = await insertContactMessage(
      {
        company: company || null,
        siret: siretExempt ? null : siret,
        name,
        email,
        phone: phone || null,
        message: finalMessage,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        emailVerifiedStatus: emailCheck.status,
        attribution,
      },
      { event },
    )

    
    
    
    await syncContactMessageToCrm(
      id,
      { company, name, email, phone, siret: siretExempt ? null : siret, message: finalMessage },
      { event },
    )

    
    
    
    const sourceHost = getRequestHost(event) || null
    sendAdminContactFormEmail({
      firstname: name,
      lastname:  '',
      email,
      phone:     phone || undefined,
      message: finalMessage,
      sourceHost,
    }).catch((err: any) => console.error(`[contact:${email}] mail admin KO:`, err?.message || err))

    
    
    await sendContactAckEmail(event, {
      email,
      lang:        String(body?.lang ?? ''),
      emailStatus: emailCheck.status,
      shopName:    shop?.shopName || '',
      sourceHost,
    }).catch((err: any) => console.error(`[contact:${email}] accusé KO:`, err?.message || err))

    
    
    
    const sfParts = name.trim().split(/\s+/)
    const sfFirst = sfParts[0] ?? name
    const sfLast  = sfParts.slice(1).join(' ') || '-'
    try {
      const { syncLead } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-sync')
      const { enqueueSfOutbox } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-outbox')
      const sfInput = {
        firstName:   sfFirst,
        lastName:    sfLast,
        email,
        company:     company || name,
        siret:       siret || undefined,
        phone:       phone || undefined,
        description: finalMessage,
        leadSource:  'Site web' as const,
        mode:        'realtime' as const,
      }
      const sfResult = await syncLead(sfInput)
      if (sfResult.status === 'failed') {
        await enqueueSfOutbox(sfInput)
        console.warn(`[contact:sf] sync failed (enqueued) — ${sfResult.errorMessage}`)
      } else if (sfResult.status !== 'disabled') {
        console.log(`[contact:sf] SF sync ${sfResult.status} sfId=${('sfId' in sfResult ? sfResult.sfId : '') ?? ''} (${sfResult.durationMs}ms)`)
      }
    } catch (sfErr: any) {
      
      if (!sfErr?.message?.includes('Cannot find module') && !sfErr?.message?.includes('Failed to resolve')) {
        console.warn('[contact:sf] SF sync error:', sfErr?.message)
      }
    }

    return { success: true, id }
  }
  catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur DB inconnue'
    console.error('[contact] INSERT failed:', msg)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service temporairement indisponible — réessayez dans quelques minutes',
      data: { code: 'SERVICE_UNAVAILABLE' },
    })
  }
})
