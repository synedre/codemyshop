

import { useClientDb } from '~/server/utils/db'

const WHITELIST_KEYS = [
  'PS_B2B_ENABLE',
  'PS_B2B_HIDE_PRICES',
  'PS_CATALOG_MODE',
  'PS_GUEST_CHECKOUT_ENABLED',
  'PS_ORDER_RETURN',
  
  'PS_PURCHASE_MINIMUM',
  'PS_QUOTE_ALLOW_MAGICLINK_UNDER_MIN',
  
  'PS_PWA_INSTALL_BANNER',
  
  
  'PS_PRICE_ROUND_UP',
] as const

type FlagKey = typeof WHITELIST_KEYS[number]

const FLAG_DEFAULTS: Partial<Record<FlagKey, string>> = {
  PS_PWA_INSTALL_BANNER: '1',
}

export default defineEventHandler(async (event) => {
  try {
    const db = useClientDb(event)
    const placeholders = WHITELIST_KEYS.map(() => '?').join(',')
    const rows = await db.query<{ name: string; value: string }>(
      `SELECT name, value FROM ps_configuration WHERE name IN (${placeholders})`,
      WHITELIST_KEYS as unknown as string[],
    )

    const flags: Record<FlagKey, string> = {} as Record<FlagKey, string>
    for (const key of WHITELIST_KEYS) flags[key] = FLAG_DEFAULTS[key] ?? '0'
    for (const row of rows) {
      if ((WHITELIST_KEYS as readonly string[]).includes(row.name)) {
        flags[row.name as FlagKey] = row.value
      }
    }

    return { flags }
  } catch (err: any) {
    console.error('[hub/configuration/flags] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
