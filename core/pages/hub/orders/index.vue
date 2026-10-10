<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.orders.title', 'Commandes') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total > 1 ? t('hub.ui.orders.count_other', '{count} commandes', { count: total }) : t('hub.ui.orders.count_one', '{count} commande', { count: total }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="selectedIds.size"
          :disabled="printing"
          @click="printSelection"
          class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-300 inline-flex items-center gap-1.5"
          :title="t('hub.ui.orders.print_title', 'Imprimer la sélection en PDF (ZIP si plusieurs)')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" /></svg>
          {{ printing ? t('hub.ui.orders.printing', 'PDF en cours…') : t('hub.ui.orders.print_n', 'Imprimer ({count})', { count: selectedIds.size }) }}
        </button>
        <select v-model="statusFilter" @change="goPage(1)" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option value="">{{ t('hub.ui.orders.all_statuses', 'Tous les statuts') }}</option>
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <input v-model="search" type="text" :placeholder="t('hub.ui.orders.search_ph', 'Réf, client, email…')" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">{{ t('hub.ui.orders.search', 'Rechercher') }}</button>
      </div>
    </header>

    
    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.orders.pagination_label', 'commandes')"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-3 py-2.5 font-medium w-8">
              <input
                type="checkbox"
                :checked="allVisibleSelected"
                :indeterminate.prop="someVisibleSelected"
                @change="toggleSelectAllVisible"
                class="accent-emerald-600 cursor-pointer"
                :title="t('hub.ui.orders.select_all', 'Tout sélectionner sur cette page')"
              />
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('id')">
              # <span v-if="sortBy === 'id'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('customer')">
              {{ t('hub.ui.orders.customer', 'Client') }} <span v-if="sortBy === 'customer'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.orders.company', 'Société') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.orders.status', 'Statut') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.orders.payment', 'Paiement') }}</th>
            <th class="px-4 py-2.5 font-medium text-right cursor-pointer hover:text-gray-600" @click="toggleSort('total')">
              {{ t('hub.ui.orders.total_ttc', 'Total TTC') }} <span v-if="sortBy === 'total'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('date')">
              {{ t('hub.ui.orders.date', 'Date') }} <span v-if="sortBy === 'date'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.orders.actions', 'Actions') }}</th>
          </tr>
          
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5">
              <button
                v-if="hasActiveColFilter"
                @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap"
                :title="t('hub.ui.orders.reset_filters', 'Réinitialiser les filtres')"
              >×</button>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fId" type="text" :placeholder="t('hub.ui.orders.f_id_ph', '# / réf…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCustomer" type="text" :placeholder="t('hub.ui.orders.f_customer_ph', 'Client…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCompany" type="text" :placeholder="t('hub.ui.orders.f_company_ph', 'Société…')" class="filter-input" /></th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fStatus" class="filter-input">
                <option value="">{{ t('hub.ui.orders.all', 'Tous') }}</option>
                <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fPayment" type="text" :placeholder="t('hub.ui.orders.f_payment_ph', 'Paiement…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model.number="colFilters.fTotalMin" type="number" min="0" step="10" :placeholder="t('hub.ui.orders.f_min_ph', 'Min €')" class="filter-input text-right tabular-nums" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fDateFrom" type="date" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          
          <HubTableSkeletonRows v-if="loading && !orders.length" :rows="10" :colspan="9" />
          <tr v-else-if="!orders.length">
            <td colspan="9" class="text-center py-20 text-sm text-gray-400">{{ t('hub.ui.orders.none_found', 'Aucune commande trouvée') }}</td>
          </tr>
          <tr v-else v-for="o in orders" :key="o.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors" :class="selectedIds.has(o.id) ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''">
            <td class="px-3 py-2.5">
              <input
                type="checkbox"
                :checked="selectedIds.has(o.id)"
                @change="toggleOne(o.id)"
                class="accent-emerald-600 cursor-pointer"
              />
            </td>
            <td class="px-4 py-2.5">
              <NuxtLink :to="`/hub/orders/${o.id}`" class="font-mono text-xs text-primary-600 hover:underline font-medium">#{{ o.id }}</NuxtLink>
              <span class="ml-1 text-[10px] text-gray-400">{{ o.reference }}</span>
            </td>
            <td class="px-4 py-2.5">
              <p class="text-gray-800 dark:text-slate-100 text-sm truncate max-w-[160px]">{{ o.customerName }}</p>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[140px]">{{ o.customerCompany || '—' }}</td>
            <td class="px-4 py-2.5">
              <select
                :value="o.statusId"
                @change="changeStatus(o, Number(($event.target as HTMLSelectElement).value))"
                class="text-[11px] px-2 py-1 rounded-full font-medium border-0 cursor-pointer"
                :style="{ backgroundColor: (o.statusColor || '#999') + '20', color: o.statusColor || '#999' }"
              >
                <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[120px]">{{ o.payment }}</td>
            <td class="px-4 py-2.5 text-right font-bold text-sm">{{ formatEur(o.totalPaidTTC) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(o.dateAdd) }}</td>
            <td class="px-4 py-2.5 text-center">
              <div class="flex items-center justify-center gap-1">
                <a v-if="o.invoiceId" :href="`/api/bo/invoices/pdf?id=${o.invoiceId}`" target="_blank" :title="t('hub.ui.orders.invoice_pdf', 'Facture PDF')" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                </a>
                <NuxtLink :to="`/hub/orders/${o.id}`" :title="t('hub.ui.orders.view_detail', 'Voir détail')" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.orders.pagination_label', 'commandes')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const route = useRoute()
const orders = ref<any[]>([])
const statuses = ref<any[]>([])
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
const statusFilter = ref('')

const customerIdFilter = computed(() => route.query.customerId ? Number(route.query.customerId) : 0)
const sortBy = ref('id')
const sortDir = ref<'ASC' | 'DESC'>('DESC')

const { colFilters, hasActiveColFilter, clearColFilters } = useHubColFilters({
  initial: {
    fId: '',
    fCustomer: '',
    fCompany: '',
    fStatus: '' as string | number,
    fPayment: '',
    fTotalMin: 0,
    fDateFrom: '',
  },
  onChange: () => { page.value = 1; load() },
})

const selectedIds = ref<Set<number>>(new Set())
const printing = ref(false)

const allVisibleSelected = computed(() => orders.value.length > 0 && orders.value.every(o => selectedIds.value.has(o.id)))
const someVisibleSelected = computed(() => orders.value.some(o => selectedIds.value.has(o.id)) && !allVisibleSelected.value)

function toggleOne(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAllVisible() {
  const next = new Set(selectedIds.value)
  if (allVisibleSelected.value) {
    for (const o of orders.value) next.delete(o.id)
  } else {
    for (const o of orders.value) next.add(o.id)
  }
  selectedIds.value = next
}

async function printSelection() {
  if (!selectedIds.value.size || printing.value) return
  printing.value = true
  try {
    const res = await fetch('/api/bo/orders/print-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: Array.from(selectedIds.value) }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(errBody || `HTTP ${res.status}`)
    }
    const cd = res.headers.get('content-disposition') || ''
    const m = /filename="([^"]+)"/.exec(cd)
    const filename = m?.[1] || (selectedIds.value.size === 1 ? 'commande.pdf' : 'commandes.zip')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('[print-pdf] error:', err)
    alert(t('hub.ui.orders.pdf_error', 'Impossible de générer le PDF : {error}', { error: err?.message || err }))
  } finally {
    printing.value = false
  }
}

const { user } = useAuth()

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
    const data = await $fetch<any>('/api/bo/orders', {
      query: {
        page: page.value, perPage: perPage.value, search: search.value,
        status: statusFilter.value, sort: sortBy.value, dir: sortDir.value,
        fId: colFilters.fId || undefined,
        fCustomer: colFilters.fCustomer || undefined,
        fCompany: colFilters.fCompany || undefined,
        fStatus: colFilters.fStatus || undefined,
        fPayment: colFilters.fPayment || undefined,
        fTotalMin: colFilters.fTotalMin > 0 ? colFilters.fTotalMin : undefined,
        fDateFrom: colFilters.fDateFrom || undefined,
        customerId: customerIdFilter.value > 0 ? customerIdFilter.value : undefined,
      },
    })
    orders.value = data.orders ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

async function changeStatus(order: any, newStatusId: number) {
  if (order.statusId === newStatusId) return
  try {
    await $fetch(`/api/bo/orders/${order.id}/status`, {
      method: 'PUT',
      body: { statusId: newStatusId, employeeId: user.value?.id },
    })
    order.statusId = newStatusId
    const s = statuses.value.find(s => s.id === newStatusId)
    if (s) { order.status = s.name; order.statusColor = s.color }
  } catch (err: any) {
    console.error('Status update error:', err)
  }
}

async function loadStatuses() {
  try {
    const data = await $fetch<any>('/api/bo/orders/statuses')
    statuses.value = data.statuses ?? []
  } catch {  }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(() => { loadStatuses(); load() })
</script>
