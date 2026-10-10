

import { useClientDb } from '~/server/utils/db'

const DB_KEYS = [
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
] as const

type ConfigKey = typeof DB_KEYS[number]

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const placeholders = DB_KEYS.map(() => '?').join(',')
  const rows = await db.query<{ name: string; value: string | null }>(
    `SELECT name, value FROM ps_configuration WHERE name IN (${placeholders})`,
    DB_KEYS as unknown as string[],
  ).catch(() => [])

  const config: Record<ConfigKey, string> = {} as Record<ConfigKey, string>
  for (const k of DB_KEYS) config[k] = ''
  for (const r of rows) {
    if ((DB_KEYS as readonly string[]).includes(r.name)) {
      config[r.name as ConfigKey] = r.value ?? ''
    }
  }

  
  if (!config.SYSTEMPAY_MODE) config.SYSTEMPAY_MODE = process.env.SYSTEMPAY_MODE || 'TEST'

  
  
  if (config.PAYMENT_BANKWIRE_ENABLED === '') config.PAYMENT_BANKWIRE_ENABLED = '1'
  
  
  

  
  const env = process.env
  const keys = {
    SYSTEMPAY_ID_SHOP:                !!env.SYSTEMPAY_ID_SHOP,
    SYSTEMPAY_TEST_KEY:               !!env.SYSTEMPAY_TEST_KEY,
    SYSTEMPAY_PROD_KEY:               !!env.SYSTEMPAY_PROD_KEY,
    STRIPE_SECRET_KEY:                !!env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY:           !!env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET_STOREFRONT: !!env.STRIPE_WEBHOOK_SECRET_STOREFRONT,
  }

  return { config, keys }
})
