<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink to="/hub/carts" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
      </NuxtLink>
      <div v-if="cart" class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.cart.cart_title', 'Panier #{id}', { id: cart.id }) }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(cart.dateAdd) }} — {{ cart.customerName }}</p>
      </div>
      <div v-if="order" class="flex items-center gap-2">
        <NuxtLink :to="`/hub/orders/${order.id}`" class="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          {{ t('hub.ui.cart.view_order', 'Voir commande #{id}', { id: order.id }) }}
        </NuxtLink>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8 space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="cart" class="px-6 py-6 space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">{{ t('hub.ui.cart.cart', 'Panier') }}</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.id', 'ID') }}</dt><dd class="font-mono">#{{ cart.id }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.items', 'Articles') }}</dt><dd class="font-medium">{{ items.length }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.total_qty', 'Qté totale') }}</dt><dd class="font-medium">{{ totalQty }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.created_on', 'Créé le') }}</dt><dd>{{ formatDateTime(cart.dateAdd) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.updated', 'Mis à jour') }}</dt><dd>{{ formatDateTime(cart.dateUpd) }}</dd></div>
            <div class="flex justify-between border-t border-gray-100 dark:border-slate-800 pt-2">
              <dt class="text-gray-500 cursor-help" :title="t('hub.ui.cart.order_started_tip', 'Commande initiée depuis ce panier — ne signifie pas que le paiement a été encaissé ni que la commande est validée')">{{ t('hub.ui.cart.order_started', 'Cmd. initiée') }} ⓘ</dt>
              <dd>
                <span v-if="order" class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium" :title="t('hub.ui.cart.order_started_badge_tip', 'Commande initiée — vérifiez son statut ci-dessus')">{{ t('hub.ui.cart.yes_order', 'Oui — #{id}', { id: order.id }) }}</span>
                <span v-else class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">{{ t('hub.ui.cart.no', 'Non') }}</span>
              </dd>
            </div>
          </dl>
        </div>

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">{{ t('hub.ui.cart.customer', 'Client') }}</h2>
          <p class="text-sm font-medium text-gray-800 dark:text-slate-100">{{ cart.customerName }}</p>
          <p v-if="cart.customerCompany" class="text-xs text-gray-500">{{ cart.customerCompany }}</p>
          <p v-if="cart.customerEmail" class="text-xs text-gray-400 mt-1">{{ cart.customerEmail }}</p>
          <p v-if="cart.customerPhoneMobile || cart.customerPhone" class="text-xs text-gray-500 mt-1">{{ cart.customerPhoneMobile || cart.customerPhone }}</p>
          <p v-if="!cart.customerId || cart.customerId === 0" class="text-xs text-amber-500 mt-2">{{ t('hub.ui.cart.guest', 'Visiteur non connecté') }}</p>
        </div>

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">{{ t('hub.ui.cart.estimate', 'Estimation') }}</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.total_ht', 'Total HT') }}</dt><dd class="font-medium">{{ formatEur(totalHT) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('hub.ui.cart.total_ttc_est', 'Total TTC (estimé)') }}</dt><dd class="font-bold text-lg">{{ formatEur(totalTTC) }}</dd></div>
          </dl>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.cart.products_count', 'Produits ({n})', { n: items.length }) }}</h2>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
              <th class="px-5 py-2.5 font-medium">{{ t('hub.ui.cart.product', 'Produit') }}</th>
              <th class="px-5 py-2.5 font-medium">{{ t('hub.ui.cart.ref', 'Réf.') }}</th>
              <th class="px-5 py-2.5 font-medium text-center">{{ t('hub.ui.cart.qty', 'Qté') }}</th>
              <th class="px-5 py-2.5 font-medium text-right">{{ t('hub.ui.cart.price_ht', 'Prix HT') }}</th>
              <th class="px-5 py-2.5 font-medium text-right">{{ t('hub.ui.cart.price_ttc', 'Prix TTC') }}</th>
              <th class="px-5 py-2.5 font-medium text-right">{{ t('hub.ui.cart.total_ttc', 'Total TTC') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="`${item.productId}-${item.combinationId}`" class="border-b border-gray-50 dark:border-slate-800/50">
              <td class="px-5 py-3 text-gray-800 dark:text-slate-100">{{ item.productName }}</td>
              <td class="px-5 py-3 font-mono text-xs text-gray-400">{{ item.reference || '—' }}</td>
              <td class="px-5 py-3 text-center font-medium">{{ item.quantity }}</td>
              <td class="px-5 py-3 text-right">{{ formatEur(item.priceHT) }}</td>
              <td class="px-5 py-3 text-right">{{ formatEur(item.priceTTC) }}</td>
              <td class="px-5 py-3 text-right font-bold">{{ formatEur(item.priceTTC * item.quantity) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const route = useRoute()
const cart = ref<any>(null)
const items = ref<any[]>([])
const order = ref<any>(null)
const loading = ref(true)

const totalQty = computed(() => items.value.reduce((s, i) => s + Number(i.quantity), 0))
const totalHT = computed(() => items.value.reduce((s, i) => s + Number(i.priceHT) * Number(i.quantity), 0))
const totalTTC = computed(() => items.value.reduce((s, i) => s + Number(i.priceTTC) * Number(i.quantity), 0))

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/bo/carts/${route.params.id}`)
    cart.value = data.cart
    items.value = data.items ?? []
    order.value = data.order
  } finally { loading.value = false }
}

function formatDateTime(d: string) { return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(load)
</script>
