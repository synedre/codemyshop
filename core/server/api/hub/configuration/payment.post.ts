

import { useClientDb } from '~/server/utils/db'
import { upsertConfiguration } from '~/server/utils/ps-configuration'

const WHITELIST = new Set([
  'BANK_WIRE_OWNER',
  'BANK_WIRE_DETAILS',
  'BANK_WIRE_ADDRESS',
  'BANK_WIRE_CUSTOM_TEXT',
  'SYSTEMPAY_MODE',
  'PAYMENT_BANKWIRE_ENABLED',
  'PAYMENT_SYSTEMPAY_ENABLED',
  'PAYMENT_STRIPE_ENABLED',
  'PAYMENT_KLARNA_ENABLED',
  'PAYMENT_KLARNA_MIN_AMOUNT',
  'PAYMENT_KLARNA_MAX_AMOUNT',
])

function validate(name: string, value: string): string | null {
  if (name === 'SYSTEMPAY_MODE' && value && !['TEST', 'PROD'].includes(value)) {
    return 'SYSTEMPAY_MODE doit être TEST ou PROD'
  }
  if (name === 'BANK_WIRE_DETAILS' && value.length > 500) return 'Coordonnées bancaires trop longues (max 500)'
  if (name === 'BANK_WIRE_OWNER' && value.length > 100) return 'Bénéficiaire trop long (max 100)'
  if (name === 'BANK_WIRE_ADDRESS' && value.length > 500) return 'Adresse banque trop longue (max 500)'

  if (['PAYMENT_BANKWIRE_ENABLED', 'PAYMENT_SYSTEMPAY_ENABLED',
       'PAYMENT_STRIPE_ENABLED',  'PAYMENT_KLARNA_ENABLED'].includes(name)) {
    if (value !== '0' && value !== '1') return `${name} doit être '0' ou '1'`
  }

  if (name === 'PAYMENT_KLARNA_MIN_AMOUNT' || name === 'PAYMENT_KLARNA_MAX_AMOUNT') {
    if (value === '') return null 
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return `${name} doit être un nombre >= 0`
  }

  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    value?: string
    patch?: Record<string, string>
  }>(event)

  const db = useClientDb(event)

  
  if (body?.patch && typeof body.patch === 'object' && !Array.isArray(body.patch)) {
    const patch = body.patch as Record<string, string>
    const forced: string[] = []

    
    if (patch['PAYMENT_KLARNA_ENABLED'] === '1' && patch['PAYMENT_STRIPE_ENABLED'] !== '1') {
      patch['PAYMENT_STRIPE_ENABLED'] = '1'
      forced.push('PAYMENT_STRIPE_ENABLED')
    }

    
    for (const [name, value] of Object.entries(patch)) {
      if (!WHITELIST.has(name)) {
        throw createError({ statusCode: 400, message: `Clé '${name}' non autorisée` })
      }
      const err = validate(name, value)
      if (err) throw createError({ statusCode: 400, message: err })
    }

    
    const rawMin = patch['PAYMENT_KLARNA_MIN_AMOUNT']
    const rawMax = patch['PAYMENT_KLARNA_MAX_AMOUNT']
    if (rawMin !== undefined && rawMax !== undefined && rawMin !== '' && rawMax !== '') {
      if (Number(rawMax) < Number(rawMin)) {
        throw createError({
          statusCode: 400,
          message: 'PAYMENT_KLARNA_MAX_AMOUNT doit être >= PAYMENT_KLARNA_MIN_AMOUNT',
        })
      }
    }

    
    for (const [name, value] of Object.entries(patch)) {
      await upsertConfiguration(db, name, value)
    }

    return { ok: true, patch, forced }
  }

  
  const name = String(body?.name ?? '').trim()
  const value = String(body?.value ?? '')

  if (!name || !WHITELIST.has(name)) {
    throw createError({ statusCode: 400, message: `Clé '${name}' non autorisée` })
  }
  const err = validate(name, value)
  if (err) throw createError({ statusCode: 400, message: err })

  await upsertConfiguration(db, name, value)

  return { ok: true, name, value }
})
