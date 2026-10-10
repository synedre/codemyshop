<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product_shipping.title', 'Livraison') }}</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">{{ t('hub.ui.product_shipping.subtitle', 'Dimensions, frais, délais et transporteurs autorisés.') }}</p>
      </div>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">Shipping</span>
    </div>

    
    <div>
      <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide mb-3">{{ t('hub.ui.product_shipping.dims_weight', 'Dimensions & poids') }}</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.weight', 'Poids') }}</label>
          <div class="relative">
            <input
              v-model.number="model.weight"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.000"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">kg</span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.width', 'Largeur') }}</label>
          <div class="relative">
            <input
              v-model.number="model.width"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">cm</span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.height', 'Hauteur') }}</label>
          <div class="relative">
            <input
              v-model.number="model.height"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">cm</span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.depth', 'Profondeur') }}</label>
          <div class="relative">
            <input
              v-model.number="model.depth"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">cm</span>
          </div>
        </div>
      </div>
    </div>

    
    <div class="pt-5 border-t border-gray-100 dark:border-slate-800">
      <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide mb-3">{{ t('hub.ui.product_shipping.fees_delays', 'Frais & délais') }}</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.extra_shipping', 'Frais de port supplémentaires') }}</label>
          <div class="relative max-w-[180px]">
            <input
              v-model.number="model.additionalShippingCost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">€</span>
          </div>
          <p class="text-[10px] text-gray-400 mt-1">{{ t('hub.ui.product_shipping.extra_shipping_help', 'Coût fixe ajouté aux frais de port standards (ex. produit encombrant).') }}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.delay_in_stock', 'Délai — en stock') }}</label>
            <input
              v-model="model.deliveryInStock"
              type="text"
              :placeholder="t('hub.ui.product_shipping.ph_in_stock', 'Ex. Livraison sous 24 à 48h')"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.product_shipping.delay_out_stock', 'Délai — en rupture') }}</label>
            <input
              v-model="model.deliveryOutStock"
              type="text"
              :placeholder="t('hub.ui.product_shipping.ph_out_stock', 'Ex. Réapprovisionnement sous 3 semaines')"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
        </div>
      </div>
    </div>

    
    <div class="pt-5 border-t border-gray-100 dark:border-slate-800">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">{{ t('hub.ui.product_shipping.carriers_allowed', 'Transporteurs autorisés') }}</h3>
        <span class="text-[10px] text-gray-400">
          {{ loading ? t('hub.ui.product_shipping.loading_short', 'Chargement…') : `${selectedRefs.size}/${carriers.length}` }}
        </span>
      </div>

      <div v-if="loading" class="py-6 text-center text-xs text-gray-400">{{ t('hub.ui.product_shipping.loading_carriers', 'Chargement des transporteurs…') }}</div>

      <div
        v-else-if="!carriers.length"
        class="py-6 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50/50 dark:bg-slate-950/40"
      >
        <p class="text-sm text-gray-500">{{ t('hub.ui.product_shipping.no_carrier', 'Aucun transporteur actif.') }}</p>
        <p class="text-[11px] text-gray-400 mt-1">{{ t('hub.ui.product_shipping.no_carrier_help', 'Créez un transporteur dans PrestaShop (Livraison → Transporteurs).') }}</p>
      </div>

      <div v-else class="space-y-2">
        <p class="text-[11px] text-gray-400 mb-2">
          {{ t('hub.ui.product_shipping.none_checked_before', "Si aucune case n'est cochée,") }} <span class="font-semibold">{{ t('hub.ui.product_shipping.none_checked_all', 'tous') }}</span> {{ t('hub.ui.product_shipping.none_checked_after', 'les transporteurs seront proposés (comportement PrestaShop par défaut).') }}
        </p>
        <label
          v-for="carrier in carriers"
          :key="carrier.id"
          class="flex items-center justify-between gap-3 py-2 px-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-950/60 cursor-pointer transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <input
              type="checkbox"
              :checked="selectedRefs.has(carrier.id)"
              @change="toggleCarrier(carrier.id)"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{{ carrier.name }}</p>
              <p v-if="carrier.delay" class="text-[11px] text-gray-400 truncate">{{ carrier.delay }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span v-if="carrier.isFree" class="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{{ t('hub.ui.product_shipping.free', 'Gratuit') }}</span>
            <span v-if="carrier.isModule" class="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{{ t('hub.ui.product_shipping.module', 'Module') }}</span>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useHubT()
interface Carrier {
  id: number              
  idCarrier: number       
  name: string
  isFree: number
  isModule: number
  shippingExternal: number
  position: number
  delay: string
}

interface ShippingForm {
  weight: number
  width: number
  height: number
  depth: number
  additionalShippingCost: number
  deliveryInStock: string
  deliveryOutStock: string
  carrierRefs: number[]
}

const model = defineModel<ShippingForm>({ required: true })

const carriers = ref<Carrier[]>([])
const loading = ref(true)

const selectedRefs = reactive(new Set<number>())

function syncFromModel() {
  selectedRefs.clear()
  for (const idRef of model.value.carrierRefs || []) selectedRefs.add(Number(idRef))
}

function toggleCarrier(idRef: number) {
  if (selectedRefs.has(idRef)) selectedRefs.delete(idRef)
  else selectedRefs.add(idRef)
  model.value.carrierRefs = Array.from(selectedRefs)
}

async function loadCarriers() {
  loading.value = true
  try {
    const data = await $fetch<{ carriers: Carrier[] }>('/api/bo/carriers')
    carriers.value = data.carriers || []
  } catch (err) {
    console.error('[HubProductShipping] load carriers error:', err)
    carriers.value = []
  } finally {
    loading.value = false
  }
}

watch(() => model.value.carrierRefs, syncFromModel, { immediate: true })
onMounted(loadCarriers)
</script>
