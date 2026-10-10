<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.stock.title', 'Stock') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ summary.totalProducts > 1 ? t('hub.ui.stock.tracked_other', '{n} produits suivis', { n: summary.totalProducts }) : t('hub.ui.stock.tracked_one', '{n} produit suivi', { n: summary.totalProducts }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="filter" @change="load" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option value="">{{ t('hub.ui.stock.filter_all', 'Tous') }}</option>
          <option value="low">{{ t('hub.ui.stock.filter_low', 'Stock bas (< 5)') }}</option>
          <option value="out">{{ t('hub.ui.stock.filter_out', 'Rupture (0)') }}</option>
        </select>
        <input v-model="search" type="text" :placeholder="t('hub.ui.stock.search_ph', 'Rechercher…')" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48" />
        <button @click="load" :disabled="loading" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">{{ t('hub.ui.stock.refresh', 'Rafraîchir') }}</button>
      </div>
    </header>

    
    <div class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-2.5 flex items-center gap-6 shrink-0">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-red-400" />
        <span class="text-xs text-gray-500">{{ t('hub.ui.stock.out', 'Rupture') }}</span>
        <span class="text-sm font-bold text-red-600">{{ summary.outOfStock }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-400" />
        <span class="text-xs text-gray-500">{{ t('hub.ui.stock.low_stock', 'Stock bas') }}</span>
        <span class="text-sm font-bold text-amber-600">{{ summary.lowStock }}</span>
      </div>
    </div>

    <div class="flex-1 overflow-auto px-6 py-4">
      <div v-if="loading && !stocks.length" class="space-y-2">
        <div v-for="i in 10" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">{{ t('hub.ui.stock.none_found', 'Aucun produit trouvé') }}</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-3 font-medium">{{ t('hub.ui.stock.col_product', 'Produit') }}</th>
              <th class="px-4 py-3 font-medium text-center">ID</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('hub.ui.stock.col_quantity', 'Quantité') }}</th>
              <th class="px-4 py-3 font-medium text-center">{{ t('hub.ui.stock.col_status', 'État') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-4 py-3">
                <NuxtLink :to="`/hub/products?id=${s.productId}`" class="text-gray-800 dark:text-slate-100 hover:text-primary-600">{{ s.productName }}</NuxtLink>
                <span v-if="s.combinationId" class="text-xs text-gray-400 ml-1">({{ t('hub.ui.stock.variant_short', 'var.') }} #{{ s.combinationId }})</span>
              </td>
              <td class="px-4 py-3 text-center font-mono text-xs text-gray-400">{{ s.productId }}</td>
              <td class="px-4 py-3 text-right font-bold" :class="s.quantity <= 0 ? 'text-red-600' : s.quantity < 5 ? 'text-amber-600' : 'text-gray-800 dark:text-slate-100'">{{ s.quantity }}</td>
              <td class="px-4 py-3 text-center">
                <span v-if="s.quantity <= 0" class="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{{ t('hub.ui.stock.out', 'Rupture') }}</span>
                <span v-else-if="s.quantity < 5" class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">{{ t('hub.ui.stock.badge_low', 'Bas') }}</span>
                <span v-else class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()
const stocks = ref<any[]>([])
const summary = ref({ totalProducts: 0, outOfStock: 0, lowStock: 0 })
const loading = ref(false)
const filter = ref('')
const search = ref('')

const filtered = computed(() => {
  if (!search.value) return stocks.value
  const q = search.value.toLowerCase()
  return stocks.value.filter(s => s.productName.toLowerCase().includes(q) || String(s.productId).includes(q))
})

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/stock', { query: { limit: 500, filter: filter.value } })
    stocks.value = data.stocks ?? []
    summary.value = data.summary ?? { totalProducts: 0, outOfStock: 0, lowStock: 0 }
  } finally { loading.value = false }
}

onMounted(load)
</script>
