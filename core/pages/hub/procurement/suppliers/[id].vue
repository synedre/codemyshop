
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/procurement/suppliers" class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 inline-flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          {{ tHub('hub.ui.supplier_detail.back', 'Fournisseurs') }}
        </NuxtLink>
        <span class="text-gray-300 dark:text-slate-700">/</span>
        <h1 v-if="data?.supplier" class="text-lg font-bold">{{ data.supplier.name }}</h1>
        <span v-if="data?.supplier" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
          :class="data.supplier.active ? 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400' : 'bg-gray-100 text-gray-500'">
          <span class="w-1 h-1 rounded-full" :class="data.supplier.active ? 'bg-success-500' : 'bg-gray-400'" />
          {{ data.supplier.active ? tHub('hub.ui.supplier_detail.active', 'Actif') : tHub('hub.ui.supplier_detail.inactive', 'Inactif') }}
        </span>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div v-if="loading" class="text-xs text-gray-400">{{ tHub('hub.ui.supplier_detail.loading', 'Chargement…') }}</div>

      <template v-else-if="data?.supplier">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{{ tHub('hub.ui.supplier_detail.contact', 'Contact') }}</h2>
            <dl class="space-y-2 text-xs">
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.phone', 'Téléphone') }}</dt><dd class="font-mono">{{ data.supplier.phone || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.mobile', 'Mobile') }}</dt><dd class="font-mono">{{ data.supplier.phoneMobile || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.address', 'Adresse') }}</dt><dd class="text-right">{{ data.supplier.address1 || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.city', 'Ville') }}</dt><dd>{{ [data.supplier.postcode, data.supplier.city].filter(Boolean).join(' ') || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.country', 'Pays') }}</dt><dd>{{ data.supplier.countryName || '—' }}</dd></div>
            </dl>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{{ tHub('hub.ui.supplier_detail.reference', 'Référencement') }}</h2>
            <dl class="space-y-2 text-xs">
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.id', 'ID') }}</dt><dd class="font-mono">#{{ data.supplier.id }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.created', 'Créé le') }}</dt><dd>{{ fmtDate(data.supplier.dateAdd) }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.updated', 'Mis à jour') }}</dt><dd>{{ fmtDate(data.supplier.dateUpd) }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.products', 'Produits') }}</dt><dd class="font-bold">{{ data.products.length }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">{{ tHub('hub.ui.supplier_detail.kpi_orders', 'BC historiques') }}</dt><dd class="font-bold">{{ data.orders.length }}</dd></div>
            </dl>
          </div>
        </div>

        <div v-if="data.supplier.description" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{{ tHub('hub.ui.supplier_detail.description', 'Description') }}</h2>
          <p class="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-line">{{ data.supplier.description }}</p>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">{{ tHub('hub.ui.supplier_detail.linked_products', 'Produits rattachés') }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ tHub('hub.ui.supplier_detail.products_count', '{count} produit(s) · prix et référence fournisseur', { count: data.products.length }) }}</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_product', 'Produit') }}</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_supplier_ref', 'Réf. fournisseur') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_buy_price', 'Prix achat HT') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_stock', 'Stock') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="!data.products.length"><td colspan="4" class="px-4 py-8 text-center text-gray-400">{{ tHub('hub.ui.supplier_detail.no_products', 'Aucun produit référencé chez ce fournisseur.') }}</td></tr>
                <tr v-for="p in data.products" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2"><p class="font-semibold">{{ p.name }}</p><p class="text-[10px] text-gray-400 font-mono">{{ p.reference || `#${p.id}` }}</p></td>
                  <td class="px-4 py-2 font-mono text-[11px] text-gray-600 dark:text-slate-400">{{ p.supplierRef || '—' }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(p.priceTE) }}</td>
                  <td class="px-4 py-2 text-right tabular-nums" :class="p.stock === 0 ? 'text-danger-600 font-bold' : ''">{{ p.stock }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">{{ tHub('hub.ui.supplier_detail.po_history', 'Historique bons de commande') }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ tHub('hub.ui.supplier_detail.last_pos', '20 derniers BC') }}</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_ref', 'Référence') }}</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_state', 'État') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_total', 'Total TTC') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.created', 'Créé le') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.supplier_detail.col_delivery', 'Livraison') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="!data.orders.length"><td colspan="5" class="px-4 py-8 text-center text-gray-400">{{ tHub('hub.ui.supplier_detail.no_pos', 'Aucun bon de commande.') }}</td></tr>
                <tr v-for="o in data.orders" :key="o.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer" @click="navigateTo(`/hub/procurement/purchase-orders/${o.id}`)">
                  <td class="px-4 py-2 font-mono text-[11px]">{{ o.reference }}</td>
                  <td class="px-4 py-2"><span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">{{ o.stateName }}</span></td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(o.totalTTC) }}</td>
                  <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(o.dateAdd) }}</td>
                  <td class="px-4 py-2 text-right text-gray-500">{{ o.deliveryDate ? fmtDate(o.deliveryDate) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const { t: tHub } = useHubT()

const route = useRoute()
const data = ref<any>(null)
const loading = ref(true)

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

async function load() {
  loading.value = true
  try {
    data.value = await $fetch(`/api/bo/procurement/suppliers/${route.params.id}`)
  } catch { data.value = null }
  finally { loading.value = false }
}

onMounted(load)
</script>
