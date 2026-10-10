
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const { t } = useHubT()

interface Promotion {
  id: number
  idProduct: number
  idGroup: number
  productName: string | null
  productRef: string | null
  reduction: number
  reductionType: 'percentage' | 'amount'
  reductionTax: number
  fromQuantity: number
  dateFrom: string | null
  dateTo: string | null
  status: 'active' | 'future' | 'expired'
}

const status = ref<'all' | 'active' | 'future' | 'expired'>('active')
const search = ref('')
const limit  = ref(50)
const offset = ref(0)

const selectedIds = ref<Set<number>>(new Set())
const selectedCount = computed(() => selectedIds.value.size)
const allPageSelected = computed(() =>
  promotions.value.length > 0 &&
  promotions.value.every((p) => selectedIds.value.has(p.id)),
)
function toggleRow(id: number) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}
function togglePage() {
  const s = new Set(selectedIds.value)
  if (allPageSelected.value) {
    promotions.value.forEach((p) => s.delete(p.id))
  } else {
    promotions.value.forEach((p) => s.add(p.id))
  }
  selectedIds.value = s
}
function clearSelection() { selectedIds.value = new Set() }

const bulkDeleting = ref(false)
const bulkError = ref<string | null>(null)
async function bulkDelete() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  if (!confirm(ids.length > 1
    ? t('hub.ui.products_promotions.confirm_delete_selected_other', 'Supprimer {count} promotions sélectionnées ?', { count: ids.length })
    : t('hub.ui.products_promotions.confirm_delete_selected_one', 'Supprimer {count} promotion sélectionnée ?', { count: ids.length }))) return
  bulkDeleting.value = true
  bulkError.value = null
  try {
    await $fetch('/api/bo/specific-prices/bulk', { method: 'DELETE', body: { ids } })
    clearSelection()
    await refresh()
  } catch (e: any) {
    bulkError.value = e?.data?.statusMessage || e?.message || t('hub.ui.products_promotions.delete_error', 'Erreur suppression')
  } finally {
    bulkDeleting.value = false
  }
}

async function bulkDeleteFiltered() {
  const n = total.value
  if (!n) return
  if (!confirm(t(
    'hub.promotions.confirm_delete_filtered',
    `Supprimer les ${n} promotions correspondant au filtre courant ? Cette action est définitive.`,
  ))) return
  bulkDeleting.value = true
  bulkError.value = null
  try {
    await $fetch('/api/bo/specific-prices/bulk', {
      method: 'DELETE',
      body: {
        filter: { status: status.value, search: search.value || undefined },
        expectedTotal: n,
      },
    })
    clearSelection()
    lastCreate.value = null
    await refresh()
  } catch (e: any) {
    bulkError.value = e?.data?.statusMessage || e?.message
      || t('hub.promotions.error_delete', 'Erreur suppression')
  } finally {
    bulkDeleting.value = false
  }
}

watch([status, search, limit, offset], clearSelection)

const queryParams = computed(() => ({
  status: status.value,
  search: search.value || undefined,
  limit: limit.value,
  offset: offset.value,
}))

const { data, refresh, pending } = useFetch<{ ok: boolean; total: number; promotions: Promotion[] }>(
  '/api/bo/specific-prices',
  {
    query: queryParams,
    watch: [status, search, limit, offset],
    server: false,
    lazy: true,
    default: () => ({ ok: false, total: 0, promotions: [] }),
  },
)
const promotions = computed(() => data.value?.promotions ?? [])
const total      = computed(() => data.value?.total ?? 0)

type Mode = 'product' | 'category' | 'all'
interface FormState {
  open: boolean
  editId: number | null
  mode: Mode
  idProduct: number | null
  productSearch: string
  productLabel: string
  idCategory: number | null
  categoryLabel: string
  categorySearch: string
  reductionPct: number      
  reductionAmount: number   
  reductionType: 'percentage' | 'amount'
  reductionTax: 1 | 0       
  fromQuantity: number
  idGroup: number
  dateFrom: string          
  dateTo: string
  saving: boolean
  error: string | null
}

function blankForm(): FormState {
  return {
    open: false, editId: null, mode: 'product',
    idProduct: null, productSearch: '', productLabel: '',
    idCategory: null, categoryLabel: '', categorySearch: '',
    reductionPct: 10, reductionAmount: 1, reductionType: 'percentage',
    reductionTax: 1, fromQuantity: 1, idGroup: 0,
    dateFrom: '', dateTo: '',
    saving: false, error: null,
  }
}
const form = ref<FormState>(blankForm())

const lastCreate = ref<{ mode: Mode; created: number; skipped: number; targeted: number } | null>(null)

function openCreate() {
  form.value = blankForm()
  form.value.open = true
}
function openEdit(p: Promotion) {
  form.value = blankForm()
  form.value.open = true
  form.value.editId = p.id
  form.value.mode = 'product'
  form.value.idProduct = p.idProduct
  form.value.productLabel = `#${p.idProduct} ${p.productName || ''}`
  form.value.reductionType = p.reductionType
  if (p.reductionType === 'percentage') form.value.reductionPct = +(p.reduction * 100).toFixed(2)
  else form.value.reductionAmount = +p.reduction.toFixed(2)
  form.value.reductionTax = p.reductionTax === 0 ? 0 : 1
  form.value.fromQuantity = p.fromQuantity
  form.value.idGroup = p.idGroup
  form.value.dateFrom = p.dateFrom ? p.dateFrom.slice(0, 10) : ''
  form.value.dateTo   = p.dateTo   ? p.dateTo.slice(0, 10)   : ''
}
function closeForm() { form.value.open = false }

const productResults = ref<Array<{ id: number; name: string; reference: string }>>([])
let productSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => form.value.productSearch, (s) => {
  if (productSearchTimer) clearTimeout(productSearchTimer)
  if (!s || s.length < 2) { productResults.value = []; return }
  productSearchTimer = setTimeout(async () => {
    const r = await $fetch<any>('/api/bo/products', { query: { search: s, perPage: 8, page: 1 } })
    productResults.value = (r?.products || r?.items || []).map((p: any) => ({
      id: Number(p.id || p.id_product),
      name: String(p.name || ''),
      reference: String(p.reference || ''),
    }))
  }, 250)
})
function selectProduct(p: { id: number; name: string; reference: string }) {
  form.value.idProduct = p.id
  form.value.productLabel = `#${p.id} ${p.name}${p.reference ? ` (${p.reference})` : ''}`
  form.value.productSearch = ''
  productResults.value = []
}

const categories = ref<Array<{ id: number; name: string; depth: number }>>([])
const filteredCategories = computed(() => {
  const q = form.value.categorySearch.trim().toLowerCase()
  if (!q) return categories.value.slice(0, 50)
  return categories.value.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 50)
})
function selectCategory(c: { id: number; name: string; depth: number }) {
  form.value.idCategory = c.id
  form.value.categoryLabel = c.name
  form.value.categorySearch = ''
}
async function loadCategories() {
  if (categories.value.length) return
  try {
    const r = await $fetch<any>('/api/bo/categories', { query: { perPage: 5000 } })
    const items = r?.categories || r?.items || []
    categories.value = items.map((c: any) => ({
      id: Number(c.id || c.id_category),
      name: String(c.name || ''),
      depth: Number(c.depth || c.level_depth || 0),
    }))
  } catch (e) {  }
}
watch(() => form.value.mode, (m) => { if (m === 'category') loadCategories() })

async function submitForm() {
  form.value.saving = true
  form.value.error = null
  try {
    const reduction = form.value.reductionType === 'percentage'
      ? +(form.value.reductionPct / 100).toFixed(6)
      : +form.value.reductionAmount.toFixed(6)
    if (!(reduction > 0)) throw new Error(t('hub.ui.products_promotions.err_invalid_reduction', 'Réduction invalide'))
    if (form.value.reductionType === 'percentage' && reduction >= 1) {
      throw new Error(t('hub.ui.products_promotions.err_pct_lt_100', '% doit être < 100'))
    }
    const dateFrom = form.value.dateFrom ? `${form.value.dateFrom} 00:00:00` : null
    const dateTo   = form.value.dateTo   ? `${form.value.dateTo} 23:59:59`   : null

    if (form.value.editId) {
      await $fetch(`/api/bo/specific-prices/${form.value.editId}`, {
        method: 'PUT',
        body: {
          reduction,
          reductionType: form.value.reductionType,
          reductionTax: form.value.reductionTax,
          fromQuantity: form.value.fromQuantity,
          idGroup: form.value.idGroup,
          dateFrom, dateTo,
        },
      })
    } else {
      if (form.value.mode === 'product' && !form.value.idProduct) {
        throw new Error(t('hub.promotions.error_pick_product', 'Choisis un produit'))
      }
      if (form.value.mode === 'category' && !form.value.idCategory) {
        throw new Error(t('hub.promotions.error_pick_category', 'Choisis une catégorie'))
      }
      const res = await $fetch<{ mode: Mode; created: number; skipped: number; targeted: number }>(
        '/api/bo/specific-prices',
        {
          method: 'POST',
          body: {
            mode: form.value.mode,
            idProduct: form.value.mode === 'product' ? form.value.idProduct : undefined,
            idCategory: form.value.mode === 'category' ? form.value.idCategory : undefined,
            reduction,
            reductionType: form.value.reductionType,
            reductionTax: form.value.reductionTax,
            fromQuantity: form.value.fromQuantity,
            idGroup: form.value.idGroup,
            dateFrom, dateTo,
          },
        },
      )
      
      
      lastCreate.value = form.value.mode === 'product' ? null : {
        mode: res.mode,
        created: Number(res.created || 0),
        skipped: Number(res.skipped || 0),
        targeted: Number(res.targeted || 0),
      }
    }
    closeForm()
    await refresh()
  } catch (e: any) {
    form.value.error = e?.data?.statusMessage || e?.message || t('hub.ui.products_promotions.error', 'Erreur')
  } finally {
    form.value.saving = false
  }
}

async function deletePromo(p: Promotion) {
  if (!confirm(t('hub.ui.products_promotions.confirm_delete_promo', 'Supprimer la promotion sur "{name}" ?', { name: p.productName || p.idProduct }))) return
  await $fetch(`/api/bo/specific-prices/${p.id}`, { method: 'DELETE' })
  await refresh()
}

function fmtReduction(p: Promotion): string {
  if (p.reductionType === 'percentage') return `-${(p.reduction * 100).toFixed(p.reduction * 100 >= 10 ? 0 : 1)}%`
  return `-${p.reduction.toFixed(2)} €`
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  return d.slice(0, 10).split('-').reverse().join('/')
}
function statusPill(s: Promotion['status']): { label: string; cls: string } {
  if (s === 'active')  return { label: t('hub.ui.products_promotions.status_active', 'En cours'),  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
  if (s === 'future')  return { label: t('hub.ui.products_promotions.status_future', 'À venir'),   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
  return { label: t('hub.ui.products_promotions.status_expired', 'Expirée'), cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400' }
}
</script>

<template>
  <div class="px-6 py-6">
    
    <div class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ t('hub.ui.products_promotions.title', 'Promotions') }}</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {{ t('hub.ui.products_promotions.subtitle', 'Remises produit — un produit, une catégorie ou tout le site, avec période et type (% ou €).') }}
        </p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        {{ t('hub.ui.products_promotions.new_promo', 'Nouvelle promotion') }}
      </button>
    </div>

    
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden text-xs">
        <button
          v-for="s in (['active','future','expired','all'] as const)"
          :key="s"
          @click="status = s; offset = 0"
          :class="[
            'px-3 py-1.5 font-medium transition-colors',
            status === s
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
          ]"
        >
          {{ s === 'active' ? t('hub.ui.products_promotions.status_active', 'En cours') : s === 'future' ? t('hub.ui.products_promotions.status_future', 'À venir') : s === 'expired' ? t('hub.ui.products_promotions.filter_expired', 'Expirées') : t('hub.ui.products_promotions.filter_all', 'Toutes') }}
        </button>
      </div>
      <input
        v-model="search"
        @input="offset = 0"
        type="text" :placeholder="t('hub.ui.products_promotions.search_ph', 'Recherche produit (nom ou ref)…')"
        class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-64 bg-white dark:bg-slate-900"
      />
      <span class="text-xs text-gray-400 ml-auto">{{ total > 1 ? t('hub.ui.products_promotions.count_other', '{count} promotions', { count: total }) : t('hub.ui.products_promotions.count_one', '{count} promotion', { count: total }) }}</span>
      
      <button
        v-if="total > 0"
        @click="bulkDeleteFiltered"
        :disabled="bulkDeleting"
        class="text-xs text-red-600 hover:text-red-700 dark:text-red-400 underline underline-offset-2 disabled:opacity-50"
      >
        {{ bulkDeleting
          ? t('hub.promotions.deleting', 'Suppression…')
          : t('hub.promotions.delete_filtered', 'Supprimer les {n} filtrées').replace('{n}', String(total)) }}
      </button>
    </div>

    
    <div
      v-if="lastCreate"
      class="mb-3 flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5"
    >
      <span class="text-xs text-emerald-800 dark:text-emerald-300">
        <template v-if="lastCreate.created">
          {{ t('hub.promotions.created_count', '{n} promotions créées').replace('{n}', String(lastCreate.created)) }}
        </template>
        <template v-else>
          {{ t('hub.promotions.created_none', 'Aucune promotion créée.') }}
        </template>
        <template v-if="lastCreate.skipped">
          ·
          {{ t('hub.promotions.skipped_count', '{n} produits déjà en promotion sur la période, laissés tels quels')
              .replace('{n}', String(lastCreate.skipped)) }}
        </template>
      </span>
      <button
        @click="lastCreate = null"
        class="ml-auto text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
      >{{ t('hub.promotions.dismiss', 'Fermer') }}</button>
    </div>

    
    <p v-if="bulkError && selectedCount === 0" class="mb-3 text-xs text-red-600 dark:text-red-400">{{ bulkError }}</p>

    
    <div v-if="selectedCount > 0" class="mb-3 flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-2.5">
      <span class="text-xs font-semibold text-red-700 dark:text-red-300">
        {{ selectedCount > 1
          ? t('hub.ui.products_promotions.selected_other', '{count} promotions sélectionnées', { count: selectedCount })
          : t('hub.ui.products_promotions.selected_one', '{count} promotion sélectionnée', { count: selectedCount }) }}
      </span>
      <span v-if="bulkError" class="text-xs text-red-600 dark:text-red-400">{{ bulkError }}</span>
      <div class="ml-auto flex items-center gap-2">
        <button
          @click="clearSelection"
          class="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >{{ t('hub.ui.products_promotions.deselect', 'Désélectionner') }}</button>
        <button
          @click="bulkDelete"
          :disabled="bulkDeleting"
          class="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 transition-colors"
        >
          {{ bulkDeleting ? t('hub.ui.products_promotions.deleting', 'Suppression…') : t('hub.ui.products_promotions.delete_count', 'Supprimer ({count})', { count: selectedCount }) }}
        </button>
      </div>
    </div>

    
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-slate-400">
          <tr>
            <th class="px-4 py-2 w-8">
              <input
                type="checkbox"
                :checked="allPageSelected"
                :indeterminate="selectedCount > 0 && !allPageSelected"
                @change="togglePage"
                class="rounded border-gray-300 dark:border-slate-600 text-primary-600 cursor-pointer"
                :title="t('hub.ui.products_promotions.toggle_all', 'Tout sélectionner / désélectionner')"
              />
            </th>
            <th class="text-left px-4 py-2 font-semibold">{{ t('hub.ui.products_promotions.col_product', 'Produit') }}</th>
            <th class="text-left px-4 py-2 font-semibold">{{ t('hub.ui.products_promotions.col_reduction', 'Réduction') }}</th>
            <th class="text-left px-4 py-2 font-semibold">{{ t('hub.ui.products_promotions.col_period', 'Période') }}</th>
            <th class="text-left px-4 py-2 font-semibold">{{ t('hub.ui.products_promotions.min_qty', 'Qté min') }}</th>
            <th class="text-left px-4 py-2 font-semibold">{{ t('hub.ui.products_promotions.col_group', 'Groupe') }}</th>
            <th class="text-left px-4 py-2 font-semibold">{{ t('hub.ui.products_promotions.col_status', 'Statut') }}</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
          <tr v-if="pending">
            <td colspan="8" class="text-center py-8 text-xs text-gray-400">{{ t('hub.ui.products_promotions.loading', 'Chargement…') }}</td>
          </tr>
          <tr v-else-if="!promotions.length">
            <td colspan="8" class="text-center py-8 text-xs text-gray-400">
              {{ status === 'all' ? t('hub.ui.products_promotions.none_all', 'Aucune promotion.') : status === 'active' ? t('hub.ui.products_promotions.none_active', 'Aucune promotion active.') : status === 'future' ? t('hub.ui.products_promotions.none_future', 'Aucune promotion à venir.') : t('hub.ui.products_promotions.none_expired', 'Aucune promotion expirée.') }}
            </td>
          </tr>
          <tr
            v-for="p in promotions"
            :key="p.id"
            class="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
            :class="{ 'bg-red-50/50 dark:bg-red-950/10': selectedIds.has(p.id) }"
          >
            <td class="px-4 py-2.5">
              <input
                type="checkbox"
                :checked="selectedIds.has(p.id)"
                @change="toggleRow(p.id)"
                class="rounded border-gray-300 dark:border-slate-600 text-primary-600 cursor-pointer"
              />
            </td>
            <td class="px-4 py-2.5">
              <div class="font-medium text-gray-800 dark:text-slate-200 line-clamp-1">{{ p.productName || t('hub.ui.products_promotions.product_n', 'Produit #{id}', { id: p.idProduct }) }}</div>
              <div v-if="p.productRef" class="text-[11px] font-mono text-gray-400">{{ p.productRef }}</div>
            </td>
            <td class="px-4 py-2.5">
              <span class="font-semibold text-red-600 dark:text-red-400">{{ fmtReduction(p) }}</span>
              <span class="text-[11px] text-gray-400 ml-1">{{ p.reductionTax ? t('hub.ui.products_promotions.tax_incl', 'TTC') : t('hub.ui.products_promotions.tax_excl', 'HT') }}</span>
            </td>
            <td class="px-4 py-2.5 text-gray-600 dark:text-slate-300">
              {{ fmtDate(p.dateFrom) }} → {{ fmtDate(p.dateTo) }}
            </td>
            <td class="px-4 py-2.5 text-gray-600 dark:text-slate-300">{{ p.fromQuantity }}</td>
            <td class="px-4 py-2.5 text-gray-600 dark:text-slate-300">{{ p.idGroup === 0 ? t('hub.ui.products_promotions.all_groups', 'Tous') : `#${p.idGroup}` }}</td>
            <td class="px-4 py-2.5">
              <span :class="['inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', statusPill(p.status).cls]">
                {{ statusPill(p.status).label }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap">
              <button @click="openEdit(p)" class="text-xs text-primary-600 hover:text-primary-700 mr-3">{{ t('hub.ui.products_promotions.edit', 'Éditer') }}</button>
              <button @click="deletePromo(p)" class="text-xs text-red-600 hover:text-red-700">{{ t('hub.ui.products_promotions.delete', 'Supprimer') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <div v-if="total > limit" class="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
      <span>{{ t('hub.ui.products_promotions.range_of', '{from} – {to} sur {total}', { from: offset + 1, to: Math.min(offset + limit, total), total }) }}</span>
      <div class="flex gap-2">
        <button :disabled="offset === 0" @click="offset = Math.max(0, offset - limit)" class="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded disabled:opacity-50">{{ t('hub.ui.products_promotions.previous', 'Précédent') }}</button>
        <button :disabled="offset + limit >= total" @click="offset = offset + limit" class="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded disabled:opacity-50">{{ t('hub.ui.products_promotions.next', 'Suivant') }}</button>
      </div>
    </div>

    
    <div v-if="form.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="bg-white dark:bg-slate-900 w-full max-w-xl rounded-xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-900 dark:text-slate-100">
            {{ form.editId ? t('hub.ui.products_promotions.edit_promo', 'Éditer la promotion') : t('hub.ui.products_promotions.new_promo', 'Nouvelle promotion') }}
          </h2>
          <button @click="closeForm" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">✕</button>
        </div>

        <form @submit.prevent="submitForm" class="space-y-4">
          
          <div v-if="!form.editId" class="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              @click="form.mode = 'product'"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', form.mode === 'product' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300']"
            >{{ t('hub.ui.products_promotions.mode_product', 'Produit ciblé') }}</button>
            <button
              type="button"
              @click="form.mode = 'category'"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', form.mode === 'category' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300']"
            >{{ t('hub.ui.products_promotions.mode_category', 'Catégorie entière') }}</button>
            <button
              type="button"
              @click="form.mode = 'all'"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', form.mode === 'all' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300']"
            >{{ t('hub.promotions.mode_all', 'Tout le site') }}</button>
          </div>

          
          <div v-if="form.mode === 'product' || form.editId">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.col_product', 'Produit') }}</label>
            <div v-if="form.editId || form.idProduct" class="text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2">
              {{ form.productLabel || `#${form.idProduct}` }}
              <button v-if="!form.editId" type="button" @click="form.idProduct = null; form.productLabel = ''" class="ml-2 text-xs text-red-600">{{ t('hub.ui.products_promotions.remove', 'retirer') }}</button>
            </div>
            <div v-else class="relative">
              <input
                v-model="form.productSearch"
                type="text" :placeholder="t('hub.ui.products_promotions.product_search_ph', 'Rechercher produit (nom, ref)…')"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
              />
              <ul v-if="productResults.length" class="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow max-h-56 overflow-auto">
                <li
                  v-for="p in productResults" :key="p.id"
                  @click="selectProduct(p)"
                  class="px-3 py-1.5 text-xs cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30"
                >
                  <span class="font-medium">{{ p.name }}</span>
                  <span class="ml-2 text-gray-400">#{{ p.id }}{{ p.reference ? ' · ' + p.reference : '' }}</span>
                </li>
              </ul>
            </div>
          </div>

          
          <div v-else-if="form.mode === 'category'">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.category_label', 'Catégorie (subtree inclus)') }}</label>
            <div v-if="form.idCategory" class="text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2">
              {{ form.categoryLabel || `#${form.idCategory}` }}
              <button type="button" @click="form.idCategory = null; form.categoryLabel = ''" class="ml-2 text-xs text-red-600">{{ t('hub.ui.products_promotions.remove', 'retirer') }}</button>
            </div>
            <div v-else class="relative">
              <input
                v-model="form.categorySearch"
                type="text" :placeholder="t('hub.ui.products_promotions.category_search_ph', 'Rechercher catégorie (ex: sachet 200g)…')"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
              />
              <ul v-if="filteredCategories.length" class="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow max-h-72 overflow-auto">
                <li
                  v-for="c in filteredCategories" :key="c.id"
                  @click="selectCategory(c)"
                  class="px-3 py-1.5 text-xs cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30"
                >
                  <span class="text-gray-400">{{ '— '.repeat(c.depth) }}</span>
                  <span class="font-medium">{{ c.name }}</span>
                  <span class="ml-2 text-gray-400">#{{ c.id }}</span>
                </li>
              </ul>
              <p v-else-if="form.categorySearch" class="text-[11px] text-gray-400 mt-1">{{ t('hub.ui.products_promotions.no_category_match', 'Aucune catégorie ne contient « {query} ».', { query: form.categorySearch }) }}</p>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">{{ t('hub.ui.products_promotions.category_help', 'Crée une promo individuelle pour chaque produit actif de la catégorie.') }}</p>
          </div>

          
          <div v-else class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
            <p class="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {{ t('hub.promotions.all_scope_title', 'La remise s\'applique à tout le catalogue actif.') }}
            </p>
            <p class="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
              {{ t('hub.promotions.all_scope_hint', 'Les produits déjà en promotion sur la période choisie sont laissés tels quels : leur remise actuelle n\'est pas remplacée.') }}
            </p>
          </div>

          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.type_label', 'Type') }}</label>
              <select
                v-model="form.reductionType"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
              >
                <option value="percentage">{{ t('hub.ui.products_promotions.type_pct', 'Pourcentage') }}</option>
                <option value="amount">{{ t('hub.ui.products_promotions.type_amount', 'Montant fixe') }}</option>
              </select>
            </div>
            <div v-if="form.reductionType === 'percentage'">
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.pct_label', '% de réduction') }}</label>
              <input v-model.number="form.reductionPct" type="number" min="0.01" max="99.99" step="0.5" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
            <div v-else>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.amount_label', 'Montant (€)') }}</label>
              <input v-model.number="form.reductionAmount" type="number" min="0.01" step="0.01" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
          </div>

          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.from_label', 'Du (vide = toujours)') }}</label>
              <input v-model="form.dateFrom" type="date" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.to_label', 'Au (vide = jamais)') }}</label>
              <input v-model="form.dateTo" type="date" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
          </div>

          
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.min_qty', 'Qté min') }}</label>
              <input v-model.number="form.fromQuantity" type="number" min="1" step="1" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">{{ t('hub.ui.products_promotions.customer_group', 'Groupe client') }}</label>
              <input v-model.number="form.idGroup" type="number" min="0" step="1" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
              <p class="text-[10px] text-gray-400 mt-0.5">{{ t('hub.ui.products_promotions.zero_all', '0 = tous') }}</p>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
                <input type="checkbox" :checked="form.reductionTax === 1" @change="form.reductionTax = ($event.target as HTMLInputElement).checked ? 1 : 0" />
                {{ t('hub.ui.products_promotions.include_vat', 'Inclure TVA (TTC)') }}
              </label>
            </div>
          </div>

          <p v-if="form.error" class="text-xs text-red-600">{{ form.error }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeForm" class="px-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.products_promotions.cancel', 'Annuler') }}</button>
            <button type="submit" :disabled="form.saving" class="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50">
              {{ form.saving ? t('hub.ui.products_promotions.saving', 'Enregistrement…') : (form.editId ? t('hub.ui.products_promotions.save', 'Enregistrer') : t('hub.ui.products_promotions.create', 'Créer')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
