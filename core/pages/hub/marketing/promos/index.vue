<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.marketing_promos.title', 'Codes promo') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total > 1 ? t('hub.ui.marketing_promos.count_other', '{count} codes', { count: total }) : t('hub.ui.marketing_promos.count_one', '{count} code', { count: total }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setFilter('')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="filter === '' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.marketing_promos.all', 'Tous') }}</button>
          <button @click="setFilter('active')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="filter === 'active' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.marketing_promos.active', 'Actifs') }}</button>
          <button @click="setFilter('expired')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="filter === 'expired' ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.marketing_promos.expired', 'Expirés') }}</button>
        </div>
        <HubLangSelector :aria-label="t('hub.ui.marketing_promos.display_lang', 'Langue d\'affichage des codes promo')" />
        <input
          v-model="search"
          type="text"
          :placeholder="t('hub.ui.marketing_promos.search_ph', 'Code, nom…')"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-40"
          @keyup.enter="goPage(1)"
        />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">{{ t('hub.ui.marketing_promos.search', 'Rechercher') }}</button>
        <NuxtLink
          to="/hub/marketing/promos/new"
          class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          {{ t('hub.ui.marketing_promos.new_code', '+ Nouveau code') }}
        </NuxtLink>
      </div>
    </header>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.marketing_promos.codes_label', 'codes')"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 6" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!rules.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">{{ t('hub.ui.marketing_promos.none', 'Aucun code promo') }}</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.marketing_promos.th_code', 'Code') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.marketing_promos.th_name', 'Nom') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.marketing_promos.th_discount', 'Réduction') }}</th>
            <th class="px-4 py-2.5 font-medium text-right">{{ t('hub.ui.marketing_promos.th_min_order', 'Min. commande') }}</th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.marketing_promos.th_uses', 'Utilisations') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.marketing_promos.th_validity', 'Validité') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.marketing_promos.th_status', 'Statut') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rules"
            :key="r.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            @click="openRule(r.id)"
          >
            <td class="px-4 py-2.5 font-mono text-xs font-bold text-primary-600">{{ r.code || '—' }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ r.name || '—' }}</td>
            <td class="px-4 py-2.5">
              <span v-if="Number(r.reductionPercent) > 0" class="text-sm font-bold text-emerald-600">-{{ Number(r.reductionPercent) }}%</span>
              <span v-else-if="Number(r.reductionAmount) > 0" class="text-sm font-bold text-emerald-600">-{{ formatEur(r.reductionAmount) }}</span>
              <span v-else-if="r.freeShipping" class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{{ t('hub.ui.marketing_promos.free_shipping', 'Port offert') }}</span>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-right text-xs text-gray-500">{{ Number(r.minimumAmount) > 0 ? formatEur(r.minimumAmount) : '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <span class="text-xs text-gray-600">{{ r.quantity }}</span>
              <span v-if="r.quantityPerUser" class="text-[10px] text-gray-400 ml-1">({{ t('hub.ui.marketing_promos.per_person', '{count}/pers', { count: r.quantityPerUser }) }})</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">
              {{ formatDate(r.dateFrom) }} → {{ formatDate(r.dateTo) }}
            </td>
            <td class="px-4 py-2.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="{
                  'bg-emerald-50 text-emerald-600': r.status === 'active',
                  'bg-gray-100 text-gray-500': r.status === 'expired' || r.status === 'inactive',
                  'bg-red-50 text-red-500': r.status === 'exhausted',
                }">
                {{ statusLabel(r.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.marketing_promos.codes_label', 'codes')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { t } = useHubT()
const router = useRouter()
const { currentLangId } = useHubLang()

const rules = ref<any[]>([])
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
const filter = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

function setFilter(f: string) {
  filter.value = f
  page.value = 1
  load()
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

function openRule(id: number) {
  router.push(`/hub/marketing/promos/${id}`)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/marketing/promos', {
      query: { page: page.value, perPage: perPage.value, search: search.value, filter: filter.value, lang: currentLangId.value },
    })
    rules.value = data.rules ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function statusLabel(s: string) {
  switch (s) {
    case 'active': return t('hub.ui.marketing_promos.st_active', 'Actif')
    case 'expired': return t('hub.ui.marketing_promos.st_expired', 'Expiré')
    case 'exhausted': return t('hub.ui.marketing_promos.st_exhausted', 'Épuisé')
    case 'inactive': return t('hub.ui.marketing_promos.st_inactive', 'Inactif')
    default: return s
  }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(() => load())

watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value) load()
})
</script>
