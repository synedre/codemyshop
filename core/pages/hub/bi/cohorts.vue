
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.bi_cohorts.title', 'Cohortes Clients') }}</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            {{ t('hub.ui.bi_cohorts.subtitle', 'Rétention mensuelle, LTV par cohorte d\'acquisition, segmentation RFM') }}
          </p>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.bi_cohorts.rfm_title', 'Segmentation RFM') }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            {{ (data?.rfm.total ?? 0) > 1 ? t('hub.ui.bi_cohorts.rfm_sub_other', 'Récence / Fréquence / Montant — {n} clients classifiés', { n: data?.rfm.total ?? 0 }) : t('hub.ui.bi_cohorts.rfm_sub_one', 'Récence / Fréquence / Montant — {n} client classifié', { n: data?.rfm.total ?? 0 }) }}
          </p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-slate-800">
          <div v-for="seg in rfmSegments" :key="seg.key" class="px-5 py-4">
            <div class="flex items-center gap-2 mb-1">
              <span class="w-2.5 h-2.5 rounded-full" :class="seg.dotClass" />
              <p class="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wide">{{ seg.label }}</p>
            </div>
            <p class="text-2xl font-extrabold text-gray-900 dark:text-white">
              <template v-if="loading"><span class="inline-block h-7 w-12 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></template>
              <template v-else>{{ seg.value }}</template>
            </p>
            <p v-if="!loading" class="text-xs text-gray-400 mt-0.5">{{ seg.hint }}</p>
          </div>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.bi_cohorts.ltv_title', 'LTV par cohorte') }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ t('hub.ui.bi_cohorts.ltv_sub', 'Revenu cumulé moyen par client (depuis acquisition)') }}</p>
        </div>
        <div class="px-6 py-5">
          <div v-if="loading" class="h-44 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <HubSimpleChart v-else-if="ltvChart.length" :data="ltvChart" unit="€" />
          <div v-else class="h-44 flex items-center justify-center text-sm text-gray-400">{{ t('hub.ui.bi_cohorts.ltv_empty', 'Pas encore assez de cohortes pour mesurer la LTV.') }}</div>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.bi_cohorts.ret_title', 'Matrice de rétention') }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            {{ t('hub.ui.bi_cohorts.ret_sub', 'Pourcentage de clients de la cohorte ayant racheté N mois après l\'acquisition') }}
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 sticky left-0 bg-gray-50 dark:bg-slate-800/50">{{ t('hub.ui.bi_cohorts.col_cohort', 'Cohorte') }}</th>
                <th class="px-3 py-3 text-right font-semibold text-gray-500 dark:text-slate-400">{{ t('hub.ui.bi_cohorts.col_size', 'Taille') }}</th>
                <th v-for="m in maxMonths" :key="m" class="px-2 py-3 text-center font-semibold text-gray-500 dark:text-slate-400 min-w-[52px]">M+{{ m }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <template v-if="loading">
                <tr v-for="i in 6" :key="i">
                  <td class="px-4 py-3"><div class="h-4 w-16 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                  <td class="px-3 py-3"><div class="h-4 w-8 bg-gray-100 dark:bg-slate-800 rounded animate-pulse ml-auto" /></td>
                  <td v-for="m in maxMonths" :key="m" class="px-2 py-3"><div class="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                </tr>
              </template>
              <template v-else-if="data?.cohorts.length">
                <tr v-for="row in data.cohorts" :key="row.cohort" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-medium text-gray-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900">{{ formatCohort(row.cohort) }}</td>
                  <td class="px-3 py-3 text-right font-semibold text-gray-700 dark:text-slate-300 tabular-nums">{{ row.size }}</td>
                  <td v-for="m in maxMonths" :key="m" class="px-2 py-3 text-center tabular-nums"
                      :style="cellStyle(row, m)">
                    <template v-if="getCell(row, m)">
                      {{ getCell(row, m)!.retention }}%
                    </template>
                    <span v-else class="text-gray-300 dark:text-slate-700">·</span>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td :colspan="maxMonths + 2" class="px-6 py-12 text-center text-sm text-gray-400">
                  {{ t('hub.ui.bi_cohorts.ret_empty', 'Pas encore assez de commandes pour construire les cohortes.') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { t } = useHubT()

interface CohortCell { monthDelta: number; active: number; retention: number; revenue: number }
interface CohortRow  { cohort: string; size: number; cells: CohortCell[] }
interface LtvRow     { cohort: string; size: number; totalRevenue: number; ltv: number }
interface Rfm        { champions: number; loyal: number; newbies: number; atRisk: number; dormant: number; lost: number; total: number }
interface CohortsData { cohorts: CohortRow[]; ltv: LtvRow[]; rfm: Rfm }

const data    = ref<CohortsData | null>(null)
const loading = ref(true)

const fmtEur = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const monthsShort = computed(() => [
  t('hub.ui.bi_cohorts.m_jan', 'janv.'), t('hub.ui.bi_cohorts.m_feb', 'févr.'), t('hub.ui.bi_cohorts.m_mar', 'mars'), t('hub.ui.bi_cohorts.m_apr', 'avr.'), t('hub.ui.bi_cohorts.m_may', 'mai'), t('hub.ui.bi_cohorts.m_jun', 'juin'), t('hub.ui.bi_cohorts.m_jul', 'juil.'), t('hub.ui.bi_cohorts.m_aug', 'août'), t('hub.ui.bi_cohorts.m_sep', 'sept.'), t('hub.ui.bi_cohorts.m_oct', 'oct.'), t('hub.ui.bi_cohorts.m_nov', 'nov.'), t('hub.ui.bi_cohorts.m_dec', 'déc.'),
])
const formatCohort = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${monthsShort.value[Number(m) - 1] ?? m} ${y.slice(2)}`
}

const maxMonths = computed(() => {
  if (!data.value?.cohorts.length) return 11
  return Math.max(...data.value.cohorts.map(c =>
    c.cells.length ? Math.max(...c.cells.map(x => x.monthDelta)) : 0,
  ))
})

const getCell = (row: CohortRow, m: number) => row.cells.find(c => c.monthDelta === m)

function cellStyle(row: CohortRow, m: number): Record<string, string> {
  const c = getCell(row, m)
  if (!c) return {}
  const alpha = Math.min(1, c.retention / 80)
  const weight = c.retention > 60 ? 700 : c.retention > 30 ? 500 : 400
  return {
    backgroundColor: `rgba(79, 70, 229, ${alpha * 0.35})`,
    color: c.retention > 50 ? '#312e81' : '#1f2937',
    fontWeight: String(weight),
  }
}

const ltvChart = computed(() =>
  (data.value?.ltv || [])
    .filter(l => l.size > 0)
    .map(l => ({ label: formatCohort(l.cohort), value: l.ltv })),
)

const rfmSegments = computed(() => {
  const r = data.value?.rfm
  return [
    { key: 'champions', label: t('hub.ui.bi_cohorts.seg_champions', 'Champions'), value: r?.champions ?? 0, hint: t('hub.ui.bi_cohorts.hint_champions', 'R≤30j · F≥3 · M≥200€'), dotClass: 'bg-success-500' },
    { key: 'loyal',     label: t('hub.ui.bi_cohorts.seg_loyal', 'Loyaux'), value: r?.loyal ?? 0, hint: t('hub.ui.bi_cohorts.hint_loyal', 'R≤90j · F≥2'), dotClass: 'bg-primary-500' },
    { key: 'newbies',   label: t('hub.ui.bi_cohorts.seg_new', 'Nouveaux'), value: r?.newbies ?? 0, hint: t('hub.ui.bi_cohorts.hint_new', 'R≤30j · F=1'), dotClass: 'bg-sky-500' },
    { key: 'atRisk',    label: t('hub.ui.bi_cohorts.seg_at_risk', 'À risque'), value: r?.atRisk ?? 0, hint: t('hub.ui.bi_cohorts.hint_at_risk', '91-180j · F≥2'), dotClass: 'bg-amber-500' },
    { key: 'dormant',   label: t('hub.ui.bi_cohorts.seg_dormant', 'Dormants'), value: r?.dormant ?? 0, hint: t('hub.ui.bi_cohorts.hint_dormant', '31-90j · F=1'), dotClass: 'bg-gray-400' },
    { key: 'lost',      label: t('hub.ui.bi_cohorts.seg_lost', 'Perdus'), value: r?.lost ?? 0, hint: t('hub.ui.bi_cohorts.hint_lost', 'R>180j'), dotClass: 'bg-danger-500' },
  ]
})

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<CohortsData>('/api/bo/bi/cohorts')
  } catch (e) {
    console.error('[hub/bi/cohorts] fetch error', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
