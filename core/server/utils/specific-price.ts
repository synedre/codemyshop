

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface ActiveSpecificPrice {
  reduction: number
  reductionType: 'percentage' | 'amount'
  fromQuantity: number
}

interface SpContext {
  event?: any
  clientId?: string
}

export function applySpecificPrice(priceHT: number, sp: ActiveSpecificPrice | undefined): number {
  if (!sp || sp.reduction <= 0) return priceHT
  if (sp.reductionType === 'percentage') return Math.max(0, priceHT * (1 - sp.reduction))
  return Math.max(0, priceHT - sp.reduction)
}

export function specificPriceLabel(sp: ActiveSpecificPrice): string {
  if (sp.reductionType === 'percentage') return `-${Math.round(sp.reduction * 100)}%`
  return `-${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(sp.reduction)}`
}

export function pickTierForQuantity(
  tiers: ActiveSpecificPrice[] | undefined,
  quantity: number,
): ActiveSpecificPrice | undefined {
  if (!tiers || !tiers.length) return undefined
  const qty = Math.max(1, Math.floor(Number(quantity) || 1))
  let best: ActiveSpecificPrice | undefined
  for (const t of tiers) {
    if (t.fromQuantity > qty) continue
    if (!best || t.reduction > best.reduction) best = t
  }
  return best
}

export function quantityBreaks(tiers: ActiveSpecificPrice[] | undefined): ActiveSpecificPrice[] {
  return (tiers ?? [])
    .filter((t) => t.fromQuantity > 1 && t.reduction > 0)
    .sort((a, b) => a.fromQuantity - b.fromQuantity)
}

export async function getSpecificPriceTiers(
  productIds: number[],
  _ctx: SpContext = {},
): Promise<Map<number, ActiveSpecificPrice[]>> {
  const out = new Map<number, ActiveSpecificPrice[]>()
  if (!productIds.length) return out

  const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `)
  
  const result = await usePocPg().execute(sql`
    SELECT id_product, reduction, reduction_type, from_quantity
      FROM cs_main.ps_specific_price
     WHERE id_product IN (${ids})
       AND reduction > 0
       AND id_product_attribute = 0
       AND ("from" IS NULL OR "from" <= NOW())
       AND ("to"   IS NULL OR "to"   >= NOW())
  `).catch((err: any) => {
    
    
    
    
    
    
    
    console.warn('[specific-price] remises illisibles, prix de base servis :', err?.message ?? err)
    return null
  })
  if (!result) return out

  
  
  
  for (const r of (result as any[])) {
    const pid = Number(r.id_product)
    const reduction = Number(r.reduction || 0)
    const reductionType: 'percentage' | 'amount' =
      String(r.reduction_type) === 'amount' ? 'amount' : 'percentage'
    const fromQuantity = Math.max(1, Number(r.from_quantity || 1))
    const list = out.get(pid)
    if (list) list.push({ reduction, reductionType, fromQuantity })
    else out.set(pid, [{ reduction, reductionType, fromQuantity }])
  }
  for (const list of out.values()) {
    list.sort((a, b) => (a.fromQuantity - b.fromQuantity) || (b.reduction - a.reduction))
  }
  return out
}

export async function getActiveSpecificPrices(
  productIds: number[],
  ctx: SpContext = {},
): Promise<Map<number, ActiveSpecificPrice>> {
  const out = new Map<number, ActiveSpecificPrice>()
  const tiers = await getSpecificPriceTiers(productIds, ctx)
  for (const [pid, list] of tiers) {
    const sp = pickTierForQuantity(list, 1)
    if (sp) out.set(pid, sp)
  }
  return out
}
