

export function unityToShortLabel(unity: string | null | undefined): string {
  const u = String(unity || '').trim().toLowerCase()
  if (!u) return 'HT'
  if (/(?:^|[^a-z])(kil|kg)/.test(u)) return 'HT/K'
  if (/(?:^|[^a-z])(litre|^l$|\bl\b)/.test(u)) return 'HT/L'
  if (/(?:^|[^a-z])(unit|pi[èe]ce|piece)/.test(u)) return 'HT/U'
  
  return `HT/${unity}`
}

export type PriceDisplayMode = 'unit' | 'kg' | 'L' | null | undefined

export interface UnitPricingInputs {
  
  priceHT: number
  
  unitPriceRatio?: number | null
  
  unity?: string | null
  
  unitsPerPack?: number | null
  
  netWeightKg?: number | null
  
  productWeightKg?: number | null
  

  priceDisplayMode?: PriceDisplayMode
}

export interface UnitPricingResult {
  
  pricePerUnit: number | undefined
  
  unitLabel: string
  

  divisor: number | undefined
}

export function deriveUnitPricing(inp: UnitPricingInputs): UnitPricingResult {
  const { priceHT } = inp
  const unitsPerPack = Number(inp.unitsPerPack || 0)
  const unitPriceRatio = Number(inp.unitPriceRatio || 0)
  const productWeightKg = Number(inp.productWeightKg || 0)
  const netWeightKg = Number(inp.netWeightKg || 0)
  const totalKg = netWeightKg > 0 ? netWeightKg : (productWeightKg > 0 ? productWeightKg : 0)

  
  
  if (inp.priceDisplayMode === 'unit') {
    
    
    
    
    const divisor = unitsPerPack > 1
      ? unitsPerPack
      : unitPriceRatio > 0
        ? unitPriceRatio
        : 1
    return { pricePerUnit: priceHT / divisor, unitLabel: 'HT/U', divisor }
  }
  if (inp.priceDisplayMode === 'kg') {
    
    
    const kgDivisor = unitPriceRatio > 0 ? unitPriceRatio : totalKg
    if (kgDivisor > 0) {
      return { pricePerUnit: priceHT / kgDivisor, unitLabel: 'HT/K', divisor: kgDivisor }
    }
    return { pricePerUnit: undefined, unitLabel: 'HT/K', divisor: undefined }
  }
  if (inp.priceDisplayMode === 'L') {
    
    
    if (unitPriceRatio > 0) {
      return { pricePerUnit: priceHT / unitPriceRatio, unitLabel: 'HT/L', divisor: unitPriceRatio }
    }
    return { pricePerUnit: undefined, unitLabel: 'HT/L', divisor: undefined }
  }

  
  if (unitsPerPack > 1) {
    return { pricePerUnit: priceHT / unitsPerPack, unitLabel: 'HT/U', divisor: unitsPerPack }
  }

  
  if (unitPriceRatio > 0) {
    return {
      pricePerUnit: priceHT / unitPriceRatio,
      unitLabel: unityToShortLabel(inp.unity),
      divisor: unitPriceRatio,
    }
  }

  
  if (totalKg > 0) {
    return { pricePerUnit: priceHT / totalKg, unitLabel: 'HT/K', divisor: totalKg }
  }

  return { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
}

export function isCountUnity(unity: string | null | undefined): boolean {
  const u = String(unity || '').trim().toLowerCase().replace(/^par\s+/, '')
  return /^(u|un|unit[ée]?s?|pi[èe]ces?|pce?s?|sachets?)$/.test(u)
}

export function importUnitPriceRatio(
  ratio: number | undefined,
  unity: string | null | undefined,
  unitsPerPack: number | undefined,
): number | undefined {
  if (isCountUnity(unity) && unitsPerPack !== undefined && unitsPerPack >= 1) return unitsPerPack
  return ratio
}
