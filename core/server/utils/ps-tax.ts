

import type { PgAdapterClient } from '~/server/utils/db-pg-adapter'

export const TENANT_PG_FR_COUNTRY_ID = 8

const CONFIG_FLAG_TTL = 60 * 1000
const b2bCache: Record<string, { v: boolean; ts: number }> = {}
const roundUpCache: Record<string, { v: boolean; ts: number }> = {}

export async function isTenantB2b(db: PgAdapterClient): Promise<boolean> {
  const key = db.clientId
  const now = Date.now()
  if (b2bCache[key] && now - b2bCache[key].ts < CONFIG_FLAG_TTL) {
    return b2bCache[key].v
  }
  try {
    const rows = await db.query<{ name: string; value: string }>(
      `SELECT name, value FROM ps_configuration WHERE name IN ('CMS_COMMERCE_MODE', 'PS_B2B_ENABLE')`,
    )
    const map = Object.fromEntries(rows.map(r => [r.name, r.value]))
    const cmsMode = map.CMS_COMMERCE_MODE?.trim()?.toLowerCase()
    let v = false
    if (cmsMode === 'dual' || cmsMode === 'b2c') {
      v = false 
    } else if (cmsMode === 'b2b') {
      v = true
    } else if (map.PS_B2B_ENABLE === '1') {
      v = true
    }
    b2bCache[key] = { v, ts: now }
    return v
  } catch {
    return false
  }
}

export async function isPriceRoundUp(db: PgAdapterClient): Promise<boolean> {
  const key = db.clientId
  const now = Date.now()
  if (roundUpCache[key] && now - roundUpCache[key].ts < CONFIG_FLAG_TTL) {
    return roundUpCache[key].v
  }
  try {
    const row = await db.get<{ value: string }>(
      `SELECT value FROM ps_configuration WHERE name = ? LIMIT 1`,
      ['PS_PRICE_ROUND_UP'],
    )
    const v = row?.value === '1'
    roundUpCache[key] = { v, ts: now }
    return v
  } catch {
    return false
  }
}

export function _resetTaxCache(): void {
  for (const k of Object.keys(b2bCache)) delete b2bCache[k]
  for (const k of Object.keys(roundUpCache)) delete roundUpCache[k]
}

export function roundDisplayPrice(price: number, roundUp: boolean): number {
  if (!roundUp || !Number.isFinite(price) || price <= 0) return price
  return Math.ceil(price)
}

export function buildTaxJoinForPrice(b2b: boolean): string {
  if (b2b) return ''
  return `
    LEFT JOIN ps_product_shop pst ON pst.id_product = p.id_product AND pst.id_shop = 1
    LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = pst.id_tax_rules_group
                            AND tr.id_country = ${TENANT_PG_FR_COUNTRY_ID}
    LEFT JOIN ps_tax tax ON tax.id_tax = tr.id_tax AND tax.active = 1
  `
}

export function buildPriceExpr(b2b: boolean, baseCol = 'p.price'): string {
  if (b2b) return baseCol
  return `ROUND(${baseCol} * (1 + COALESCE(MAX(tax.rate), 0) / 100), 2)`
}

export function buildPriceExprNonAgg(b2b: boolean, baseCol = 'p.price'): string {
  if (b2b) return baseCol
  return `ROUND(${baseCol} * (1 + COALESCE(tax.rate, 0) / 100), 2)`
}
