<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.carts.title', 'Paniers') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total > 1 ? t('hub.ui.carts.count_other', '{n} paniers', { n: total }) : t('hub.ui.carts.count_one', '{n} panier', { n: total }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" type="text" :placeholder="t('hub.ui.carts.search_ph', 'Client, email…')" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">{{ t('hub.ui.carts.search_btn', 'Rechercher') }}</button>
      </div>
    </header>

    
    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.carts.label_plural', 'paniers')"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('id')">
              ID <span v-if="sortBy === 'id'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.carts.col_customer', 'Client') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.carts.col_email', 'Email') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.carts.col_phone', 'Tél') }}</th>
            <th class="px-4 py-2.5 font-medium text-center" :title="t('hub.ui.carts.tip_already_customer', 'Le client a déjà passé au moins une commande sur la boutique')">{{ t('hub.ui.carts.col_already_customer', 'Déjà client') }}</th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.carts.col_items', 'Articles') }}</th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.carts.col_qty', 'Qté') }}</th>
            <th class="px-4 py-2.5 font-medium text-center cursor-help" :title="t('hub.ui.carts.tip_order_started', 'Une commande a été initiée depuis ce panier — ne signifie pas que le paiement a été encaissé ni que la commande est validée')">{{ t('hub.ui.carts.col_order_started', 'Cmd. initiée') }} ⓘ</th>
            <th class="px-4 py-2.5 font-medium text-center" :title="t('hub.ui.carts.tip_reminders', 'Nombre de relances envoyées (cs_cart_recovery)')">{{ t('hub.ui.carts.col_reminders', 'Relances') }}</th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('date')">
              {{ t('hub.ui.carts.col_created', 'Créé le') }} <span v-if="sortBy === 'date'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.carts.col_updated', 'Mis à jour') }}</th>
          </tr>
          
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5"><input v-model="colFilters.fId" type="text" placeholder="#" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCustomer" type="text" :placeholder="t('hub.ui.carts.ph_customer', 'Client…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fEmail" type="text" :placeholder="t('hub.ui.carts.ph_email', 'Email…')" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fOrderedBefore" class="filter-input">
                <option value="">{{ t('hub.ui.carts.all', 'Tous') }}</option>
                <option value="1">{{ t('hub.ui.carts.yes', 'Oui') }}</option>
                <option value="0">{{ t('hub.ui.carts.no', 'Non') }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5"><input v-model.number="colFilters.fItemsMin" type="number" min="0" step="1" :placeholder="t('hub.ui.carts.ph_min', 'Min')" class="filter-input text-center tabular-nums" /></th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fConverted" class="filter-input">
                <option value="">{{ t('hub.ui.carts.all', 'Tous') }}</option>
                <option value="1">{{ t('hub.ui.carts.yes', 'Oui') }}</option>
                <option value="0">{{ t('hub.ui.carts.no', 'Non') }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5"><input v-model="colFilters.fDateFrom" type="date" class="filter-input" /></th>
            <th class="px-2 py-1.5">
              <button v-if="hasActiveColFilter" @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap" :title="t('hub.ui.carts.reset_title', 'Réinitialiser')">{{ t('hub.ui.carts.reset', '× reset') }}</button>
            </th>
          </tr>
        </thead>
        <tbody>
          <HubTableSkeletonRows v-if="loading && !carts.length" :rows="10" :colspan="10" />
          <tr v-else-if="!carts.length">
            <td colspan="11" class="text-center py-20 text-sm text-gray-400">{{ t('hub.ui.carts.empty', 'Aucun panier trouvé') }}</td>
          </tr>
          <tr v-else v-for="c in carts" :key="c.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" @click="$router.push(`/hub/carts/${c.id}`)">
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ c.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 truncate max-w-[160px]">{{ c.customerName }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-400 truncate max-w-[160px]">{{ c.customerEmail || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{{ c.customerPhone || '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="c.customerId > 0 && Number(c.hasOrderedBefore) === 1" class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{{ t('hub.ui.carts.yes', 'Oui') }}</span>
              <span v-else-if="c.customerId > 0" class="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">{{ t('hub.ui.carts.no', 'Non') }}</span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-center font-medium">{{ c.nbItems }}</td>
            <td class="px-4 py-2.5 text-center">{{ c.totalProducts }}</td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="c.hasOrder > 0" class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium cursor-help" :title="t('hub.ui.carts.tip_order_initiated', 'Commande initiée — vérifiez le statut dans Commandes pour savoir si elle est validée et payée')">{{ t('hub.ui.carts.yes', 'Oui') }}</span>
              <span v-else class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">{{ t('hub.ui.carts.no', 'Non') }}</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="Number(c.recoveriesCount) > 0" class="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
                {{ c.recoveriesCount }}
              </span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(c.dateAdd) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(c.dateUpd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.carts.label_plural', 'paniers')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()
const carts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}
const loading = ref(false)
const search = ref('')
const sortBy = ref('id')
const sortDir = ref<'ASC' | 'DESC'>('DESC')

const { colFilters, hasActiveColFilter, clearColFilters } = useHubColFilters({
  initial: {
    fId: '',
    fCustomer: '',
    fEmail: '',
    fItemsMin: 0,
    fConverted: '' as string,
    fOrderedBefore: '' as string,
    fDateFrom: '',
  },
  onChange: () => { page.value = 1; load() },
})

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  else { sortBy.value = col; sortDir.value = 'DESC' }
  goPage(1)
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/carts', { query: {
      page: page.value, perPage: perPage.value, search: search.value,
      sort: sortBy.value, dir: sortDir.value,
      fId: colFilters.fId || undefined,
      fCustomer: colFilters.fCustomer || undefined,
      fEmail: colFilters.fEmail || undefined,
      fItemsMin: colFilters.fItemsMin > 0 ? colFilters.fItemsMin : undefined,
      fConverted: colFilters.fConverted || undefined,
      fOrderedBefore: colFilters.fOrderedBefore || undefined,
      fDateFrom: colFilters.fDateFrom || undefined,
    } })
    carts.value = data.carts ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }

onMounted(load)
</script>
