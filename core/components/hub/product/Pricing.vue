<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.pricing.title', 'Prix') }}</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">Pricing</span>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.pricing.wholesale_price', 'Prix d\'achat HT') }}</label>
      <div class="relative">
        <input
          v-model.number="model.wholesalePrice"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
      </div>
      <p class="text-[10px] text-gray-400 mt-1">{{ t('hub.pricing.wholesale_price_hint', 'Coût fournisseur — sert à calculer la marge.') }}</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.pricing.price_ht', 'Prix de vente HT') }}</label>
      <div class="relative">
        <input
          v-model.number="model.priceHT"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-8 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
      </div>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.pricing.tax_rule', 'Règle de taxe') }}</label>
      <select
        v-model.number="model.taxRulesGroupId"
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      >
        <option :value="0">{{ t('hub.pricing.no_tax', 'Aucune taxe') }}</option>
        <option v-for="rule in availableTaxRules" :key="rule.id" :value="rule.id">{{ rule.label }}</option>
      </select>
    </div>

    <div class="pt-3 border-t border-gray-100 dark:border-slate-800">
      <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.pricing.price_ttc', 'Prix de vente TTC') }}</label>
      <div class="relative">
        <input
          :value="priceTTC.toFixed(2)"
          type="text"
          readonly
          class="w-full text-sm border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 rounded-lg pl-3 pr-8 py-2 font-bold text-primary-600 dark:text-primary-400 cursor-not-allowed"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
      </div>
      <p class="text-[10px] text-gray-400 mt-1">
        {{ t('hub.pricing.price_ttc_hint', 'Calculé automatiquement ({rate}% de TVA).', { rate: String(currentTaxRate) }) }}
      </p>
    </div>

    
    <div v-if="isFood" class="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.pricing.unity_label', 'Unité de vente') }}</label>
        <select
          v-model="model.unity"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        >
          <option value="">{{ t('hub.pricing.unity_none', '— Prix colis (pas de prix unitaire)') }}</option>
          <option value="Par kg">{{ t('hub.pricing.unity_kg', 'Par kg → HT/K') }}</option>
          <option value="Par pièce">{{ t('hub.pricing.unity_piece', 'Par pièce → HT/U') }}</option>
          <option value="Par L">{{ t('hub.pricing.unity_liter', 'Par litre → HT/L') }}</option>
        </select>
      </div>

      <div v-if="model.unity">
        <label class="block text-xs font-medium text-gray-500 mb-1">
          {{
            model.unity === 'Par kg'
              ? t('hub.pricing.unit_ratio_kg', 'Poids colis (kg)')
              : model.unity === 'Par L'
                ? t('hub.pricing.unit_ratio_liter', 'Volume colis (L)')
                : t('hub.pricing.unit_ratio_piece', 'Colisage (pièces par colis)')
          }}
        </label>
        <div class="relative">
          <input
            v-model.number="model.unitPriceRatio"
            type="number"
            step="0.001"
            min="0"
            placeholder="0"
            class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {{ model.unity === 'Par kg' ? 'kg' : model.unity === 'Par L' ? 'L' : t('hub.pricing.unit_ratio_suffix_piece', 'pcs') }}
          </span>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">
          {{
            model.unity === 'Par kg'
              ? t('hub.pricing.unit_ratio_hint_kg', 'Poids total du colis en kg — sert à calculer le prix au kg affiché.')
              : model.unity === 'Par L'
                ? t('hub.pricing.unit_ratio_hint_liter', 'Volume total du colis en litres — sert à calculer le prix au litre affiché.')
                : t('hub.pricing.unit_ratio_hint_piece', 'Nombre de pièces par colis — sert à calculer le prix à la pièce affiché.')
          }}
        </p>
      </div>
    </div>

    
    <div v-if="isFood" class="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-2">{{ t('hub.pricing.display_mode_label', 'Prix affiché') }}</label>
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
          <button
            v-for="opt in displayModeOptions"
            :key="opt.value ?? 'auto'"
            type="button"
            @click="model.priceDisplayMode = opt.value"
            :class="[
              'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
              model.priceDisplayMode === opt.value
                ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-200',
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">{{ t('hub.pricing.display_mode_hint', 'Conditionne l\'affichage sur les fiches et les listes.') }}</p>
      </div>

      
      <div class="bg-gray-50 dark:bg-slate-950/60 border border-gray-100 dark:border-slate-800 p-3 rounded-md">
        <span class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold block mb-1.5">{{ t('hub.pricing.display_preview', 'Aperçu') }}</span>
        <div v-if="unitPreview.price !== undefined" class="flex items-baseline gap-1.5">
          <span class="text-sm font-bold text-primary-600 dark:text-primary-400 font-mono">{{ formatEur(unitPreview.price) }}</span>
          <span class="text-xs text-gray-500 font-semibold">{{ unitPreview.label }}</span>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-500">{{ unitPreview.label }}</span>
          <span class="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
            {{ t('hub.pricing.missing_data_hint', 'Poids / colisage à renseigner') }}
          </span>
        </div>
      </div>
    </div>

    
    <div class="bg-gray-50 dark:bg-slate-950/60 border border-gray-100 dark:border-slate-800 p-4 rounded-md space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{{ t('hub.pricing.summary_title', 'Récapitulatif') }}</span>
        <span class="text-[10px] text-gray-400">HT</span>
      </div>

      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">{{ t('hub.pricing.gross_margin', 'Marge brute') }}</span>
        <span class="font-mono font-semibold" :class="grossMargin < 0 ? 'text-red-600' : 'text-gray-800 dark:text-slate-100'">
          {{ formatEur(grossMargin) }}
        </span>
      </div>

      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">{{ t('hub.pricing.margin_rate', 'Taux de marge') }}</span>
        <span class="font-mono font-semibold" :class="marginRate < 0 ? 'text-red-600' : marginRate < 10 ? 'text-amber-600' : 'text-emerald-600'">
          {{ marginRate.toFixed(2) }} %
        </span>
      </div>

      <div v-if="marginRate < 0" class="text-[10px] text-red-600 border-t border-red-200 dark:border-red-900/40 pt-2">
        {{ t('hub.pricing.loss_warning', '⚠ Prix de vente inférieur au prix d\'achat — vente à perte.') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

type PriceDisplayMode = 'unit' | 'kg' | 'L' | null

interface PricingForm {
  wholesalePrice: number
  priceHT: number
  taxRulesGroupId: number
  
  priceDisplayMode?: PriceDisplayMode
  
  unity?: string
  
  unitPriceRatio?: number
}

interface TaxRule {
  id: number
  label: string
  rate: number
}

const { t } = useHubT()
const { isFood } = useTenantProfile()

const model = defineModel<PricingForm>({ required: true })
const props = defineProps<{
  taxRules?: TaxRule[]
  
  productWeightKg?: number | null
  

  unitsPerPack?: number | null
}>()

const availableTaxRules = computed(() => props.taxRules ?? [])

const currentTaxRate = computed(() => {
  const rule = availableTaxRules.value.find(r => r.id === model.value.taxRulesGroupId)
  return rule ? rule.rate : 0
})

const priceTTC = computed(() => {
  const ht = Number(model.value.priceHT) || 0
  return Math.round(ht * (1 + currentTaxRate.value / 100) * 100) / 100
})

const grossMargin = computed(() => {
  const ht = Number(model.value.priceHT) || 0
  const cost = Number(model.value.wholesalePrice) || 0
  return ht - cost
})

const marginRate = computed(() => {
  const ht = Number(model.value.priceHT) || 0
  if (ht <= 0) return 0
  return (grossMargin.value / ht) * 100
})

function formatEur(n: number) {
  return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

const displayModeOptions: Array<{ label: string; value: PriceDisplayMode }> = [
  { label: t('hub.pricing.mode_unit', '/U (unité)'), value: 'unit' },
  { label: t('hub.pricing.mode_kg', '/kg (kilo)'), value: 'kg' },
  { label: t('hub.pricing.mode_liter', '/L (litre)'), value: 'L' },
  { label: t('hub.pricing.mode_auto', 'Auto'), value: null },
]

function unityToShortLabel(unity: string | null | undefined): string {
  const u = String(unity || '').trim().toLowerCase()
  if (!u) return 'HT'
  if (/(?:^|[^a-z])(kil|kg)/.test(u)) return 'HT/K'
  if (/(?:^|[^a-z])(litre|^l$|\bl\b)/.test(u)) return 'HT/L'
  if (/(?:^|[^a-z])(unit|pi[èe]ce|piece)/.test(u)) return 'HT/U'
  return `HT/${unity}`
}

const unitPreview = computed<{ price: number | undefined; label: string }>(() => {
  const priceHT = Number(model.value.priceHT) || 0
  const mode = model.value.priceDisplayMode ?? null
  const unitPriceRatio = Number(model.value.unitPriceRatio || 0)
  const unitsPerPack = Number(props.unitsPerPack || 0)
  const productWeightKg = Number(props.productWeightKg || 0)

  if (mode === 'unit') {
    
    const divisor = unitsPerPack > 1
      ? unitsPerPack
      : unitPriceRatio > 0
        ? unitPriceRatio
        : 1
    return { price: priceHT / divisor, label: 'HT/U' }
  }

  if (mode === 'kg') {
    
    
    const kgDivisor = unitPriceRatio > 0 ? unitPriceRatio : productWeightKg
    if (kgDivisor > 0) return { price: priceHT / kgDivisor, label: 'HT/K' }
    return { price: undefined, label: 'HT/K' }
  }

  if (mode === 'L') {
    if (unitPriceRatio > 0) return { price: priceHT / unitPriceRatio, label: 'HT/L' }
    return { price: undefined, label: 'HT/L' }
  }

  
  if (unitsPerPack > 1) return { price: priceHT / unitsPerPack, label: 'HT/U' }
  if (unitPriceRatio > 0) return { price: priceHT / unitPriceRatio, label: unityToShortLabel(model.value.unity) }
  if (productWeightKg > 0) return { price: priceHT / productWeightKg, label: 'HT/K' }
  return { price: priceHT > 0 ? priceHT : undefined, label: 'HT' }
})
</script>
