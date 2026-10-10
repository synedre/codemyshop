<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.categories.title', 'Catégories') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total > 1 ? t('hub.ui.categories.count_other', '{n} catégories', { n: total }) : t('hub.ui.categories.count_one', '{n} catégorie', { n: total }) }}</p>
        <p v-if="nonTraduites.length" class="text-xs text-amber-600 mt-1" role="status" data-creation="non-traduite">
          {{ t('hub.ui.categories.not_translated', 'Pas encore traduit en : {langues}.', { langues: nonTraduites.join(', ').toUpperCase() }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" type="text" :placeholder="t('hub.ui.categories.search_ph', 'Nom de catégorie…')" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">{{ t('hub.ui.categories.search', 'Rechercher') }}</button>
        <button
          v-if="expanded.size > 0"
          @click="collapseAll"
          class="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          :title="t('hub.ui.categories.collapse_title', 'Tout replier')"
        >{{ t('hub.ui.categories.collapse', 'Replier') }}</button>
        <button
          v-else
          @click="expandAll"
          class="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          :title="t('hub.ui.categories.expand_title', 'Tout déplier')"
        >{{ t('hub.ui.categories.expand', 'Déplier') }}</button>
        <span v-if="reorderStatus" class="text-xs ml-2" :class="reorderStatusClass">{{ reorderStatus }}</span>
        <button
          @click="runMigrateWebp"
          :disabled="migrateLoading"
          :title="t('hub.ui.categories.migrate_title', 'Convertit tous les JPG legacy des covers catégorie en WebP responsive (400/600/800/1200) + crop center 1:1 + nom SEO. Idempotent.')"
          class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': migrateLoading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          {{ migrateLoading ? t('hub.ui.categories.migrating', 'Migration…') : t('hub.ui.categories.migrate', 'Migrer WebP') }}
        </button>
        <span v-if="migrateStatus" class="text-xs" :class="migrateStatusClass">{{ migrateStatus }}</span>
        <button @click="showCreate = true" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ t('hub.ui.categories.new', 'Nouvelle') }}
        </button>
      </div>
    </header>

    
    <HubCreateModal v-model="showCreate" :title="t('hub.ui.categories.new_title', 'Nouvelle catégorie')" :loading="creating" @submit="createCategory">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.categories.name', 'Nom') }}</label>
          <input v-model="newCat.name" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" :placeholder="t('hub.ui.categories.name_ph', 'Nom de la catégorie')" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.categories.parent', 'Catégorie parent') }}</label>
          <select v-model.number="newCat.parentId" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
            <option :value="2">{{ t('hub.ui.categories.root', 'Racine') }}</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>
    </HubCreateModal>

    
    <Transition enter-active-class="transition duration-150" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-100" leave-to-class="-translate-y-2 opacity-0">
      <div v-if="selected.size > 0" class="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-200 dark:border-violet-800 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <span class="text-xs font-medium text-violet-700 dark:text-violet-300">
          {{ selected.size > 1 ? t('hub.ui.categories.selected_other', '{n} catégories sélectionnées', { n: selected.size }) : t('hub.ui.categories.selected_one', '{n} catégorie sélectionnée', { n: selected.size }) }}
        </span>
        <button @click="bulkCover" :disabled="bulkLoading" class="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
          {{ t('hub.ui.categories.gen_covers', 'Générer covers') }}
        </button>
        <button @click="bulkSeo" :disabled="bulkLoading || selected.size === 0" class="text-xs px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" /></svg>
          {{ t('hub.ui.categories.regen_seo', 'Régénérer le SEO') }}
        </button>
        <button @click="selected.clear()" class="text-xs text-violet-500 hover:text-violet-700 transition-colors">{{ t('hub.ui.categories.deselect', 'Désélectionner') }}</button>
        <span v-if="bulkStatus" class="text-xs ml-auto" :class="bulkStatusClass">{{ bulkStatus }}</span>
      </div>
    </Transition>

    
    <HubSeoBulkProgress ref="seoProgress" entity="category" />

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.categories.pagination_label', 'catégories')"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    
    <div class="px-6 py-1.5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 text-xs shrink-0">
      <button
        type="button"
        @click="selectIncomplete"
        :disabled="incompleteCount === 0"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        :title="t('hub.seo_coverage.select_incomplete_hint_cat', 'Sélectionne les catégories chargées dont le SEO FR est incomplet (à optimiser via « Régénérer le SEO »)')"
      >
        <span class="w-2 h-2 rounded-full bg-amber-400" />
        {{ t('hub.seo_coverage.select_incomplete', 'Sélectionner les incomplets') }} ({{ incompleteCount }})
      </button>
      <select v-model="seoFilter" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-900" :title="t('hub.seo_coverage.filter_hint', 'Filtrer par complétude SEO (page chargée)')">
        <option value="">{{ t('hub.seo_coverage.filter_all', 'SEO : tous') }}</option>
        <option value="incomplete">{{ t('hub.seo_coverage.filter_incomplete', 'Incomplets') }}</option>
        <option value="empty">{{ t('hub.seo_coverage.empty', 'Vide') }}</option>
        <option value="partial">{{ t('hub.seo_coverage.partial', 'Partiel') }}</option>
        <option value="complete">{{ t('hub.seo_coverage.complete', 'Complet') }}</option>
      </select>
      <span class="text-gray-400">{{ t('hub.seo_coverage.legend', 'SEO FR : vert = complet · ambre = partiel · rouge = vide') }}</span>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!categories.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">{{ t('hub.ui.categories.empty', 'Aucune catégorie trouvée') }}</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium w-10">
              <input type="checkbox" :checked="allSelected" :indeterminate="someSelected && !allSelected" @change="toggleAll" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
            </th>
            <th class="px-4 py-2.5 font-medium w-14">{{ t('hub.ui.categories.col_cover', 'Cover') }}</th>
            <th class="px-4 py-2.5 font-medium">ID</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.categories.col_name', 'Nom') }}</th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.categories.col_products', 'Produits') }}</th>
            <th class="px-4 py-2.5 font-medium text-center" :title="t('hub.seo_coverage.column_hint', 'Complétude SEO source FR (méta-titre, méta-description, description)')">SEO</th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.categories.col_active', 'Actif') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in visibleCategories"
            :key="c.id"
            draggable="true"
            @dragstart="onRowDragStart($event, c)"
            @dragend="onRowDragEnd"
            @dragover="onRowDragOver($event, c)"
            @dragleave="onRowDragLeave(c)"
            @drop="onRowDrop($event, c)"
            :class="[
              'border-b border-gray-50 dark:border-slate-800/50 transition-colors',
              dragOverId === c.id ? 'bg-primary-50 dark:bg-primary-950/30 ring-2 ring-primary-300 ring-inset' : 'hover:bg-blue-50/30 dark:hover:bg-slate-800/30',
              draggedId === c.id ? 'opacity-40' : '',
            ]"
          >
            <td class="px-4 py-2.5" @click.stop>
              <input type="checkbox" :checked="selected.has(c.id)" @change="toggleSelect(c)" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
            </td>
            <td class="px-4 py-1.5" @click.stop>
              <button v-if="c.thumbUrl && !brokenImages.has(c.id)" @click="openLightbox(c)" class="block group" :title="c.name">
                <img
                  :src="thumbSrcFor(c)"
                  :alt="c.name"
                  class="w-12 h-8 object-cover rounded border border-gray-200 dark:border-slate-700 group-hover:border-primary-400 group-hover:shadow transition-all cursor-zoom-in"
                  loading="lazy"
                  @error="onThumbError(c.id, c)"
                />
              </button>
              <span v-else class="w-12 h-8 rounded border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-300 cursor-pointer" @click="$router.push(`/hub/categories/${c.id}`)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              </span>
            </td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400 cursor-pointer" @click="$router.push(`/hub/categories/${c.id}`)">#{{ c.id }}</td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1" :style="{ paddingLeft: Math.max(0, (c.depth - 2)) * 16 + 'px' }">
                <button
                  v-if="hasChildren(c)"
                  type="button"
                  draggable="false"
                  @mousedown.stop
                  @dragstart.stop.prevent
                  @click.stop="toggleExpand(c.id)"
                  class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  :aria-label="expanded.has(c.id) ? t('hub.ui.categories.collapse', 'Replier') : t('hub.ui.categories.expand', 'Déplier')"
                >
                  <svg class="w-3 h-3 transition-transform" :class="expanded.has(c.id) ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <span v-else class="w-5 h-5 shrink-0" />
                <span
                  class="text-gray-800 dark:text-slate-100 cursor-pointer"
                  @click="$router.push(`/hub/categories/${c.id}`)"
                >{{ c.name }}</span>
              </div>
            </td>
            <td class="px-4 py-2.5 text-center cursor-pointer" @click="$router.push(`/hub/categories/${c.id}`)">
              <span v-if="c.nbProducts > 0" class="font-medium text-primary-600">{{ c.nbProducts }}</span>
              <span v-else class="text-gray-300">0</span>
            </td>
            <td class="px-4 py-2.5 text-center cursor-pointer" @click="$router.push(`/hub/categories/${c.id}`)">
              <HubSeoBadge :status="c.seoStatus" :show-label="false" class="justify-center" />
            </td>
            <td class="px-4 py-2.5 text-center cursor-pointer" @click="$router.push(`/hub/categories/${c.id}`)">
              <span v-if="c.active" class="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span v-else class="w-2 h-2 rounded-full bg-gray-300 inline-block" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.categories.pagination_label', 'catégories')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />

    
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
        <div v-if="lightbox" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 cursor-zoom-out" @click="lightbox = null">
          <button @click.stop="lightbox = null" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" :aria-label="t('hub.ui.categories.close', 'Fermer')">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
          <figure class="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3" @click.stop>
            <img :src="lightbox.coverUrl || lightbox.thumbUrl" :alt="lightbox.name" class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
            <figcaption class="text-white/80 text-sm flex items-center gap-2">
              <span class="font-medium">{{ lightbox.name }}</span>
              <span class="text-white/40">·</span>
              <span class="font-mono text-xs text-white/50">#{{ lightbox.id }}</span>
            </figcaption>
          </figure>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()

const categories = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)

const perPage = ref(1000)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}
const loading = ref(false)
const search = ref('')
const showCreate = ref(false)
const creating = ref(false)
const newCat = reactive({ name: '', parentId: 2 })

const brokenImages = reactive(new Set<number>())
const thumbFallbackMap = reactive(new Set<number>())
const legacyCovergenMap = reactive(new Set<number>())
function onThumbError(id: number, c: any) {
  if (!thumbFallbackMap.has(id)) thumbFallbackMap.add(id)
  else if (!legacyCovergenMap.has(id) && c?.legacyThumbUrl) legacyCovergenMap.add(id)
  else brokenImages.add(id)
}
function thumbSrcFor(c: any): string {
  if (legacyCovergenMap.has(c.id) && c.legacyThumbUrl) return String(c.legacyThumbUrl)
  if (thumbFallbackMap.has(c.id)) return String(c.jpgFallback || '')
  return String(c.thumbUrl || '')
}
const lightbox = ref<{ id: number; name: string; thumbUrl: string | null; coverUrl: string | null } | null>(null)
function openLightbox(c: any) {
  lightbox.value = { id: c.id, name: c.name, thumbUrl: c.thumbUrl, coverUrl: c.coverUrl || c.thumbUrl }
}
function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') lightbox.value = null }
onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))

const selected = reactive(new Set<number>())
const bulkLoading = ref(false)
const bulkStatus = ref<string | null>(null)
const bulkStatusClass = ref('text-violet-600')
const seoProgress = ref<any>(null) 

const migrateLoading = ref(false)
const migrateStatus = ref<string | null>(null)
const migrateStatusClass = ref('text-gray-500')

async function runMigrateWebp() {
  if (migrateLoading.value) return
  
  migrateLoading.value = true
  migrateStatus.value = t('hub.ui.categories.analyzing', 'Analyse…')
  migrateStatusClass.value = 'text-gray-500'
  try {
    const plan: any = await $fetch('/api/bo/categories/migrate-webp?dry_run=1', { method: 'POST' })
    const toMigrate = (plan.migrated || []).length
    const skipped = (plan.skipped || []).length
    if (toMigrate === 0) {
      migrateStatus.value = t('hub.ui.categories.nothing_to_migrate', 'Rien à migrer ({skipped} déjà à jour, {scanned} scannées)', { skipped, scanned: plan.scanned })
      migrateStatusClass.value = 'text-gray-500'
      setTimeout(() => { migrateStatus.value = null }, 6000)
      return
    }
    if (!window.confirm(t('hub.ui.categories.migrate_confirm', 'Migration WebP\n\n• {scanned} catégories scannées\n• {todo} seront converties (crop center 1:1, 4 WebP + JPG fallback)\n• {skipped} déjà à jour (skip)\n\nContinuer ?', { scanned: plan.scanned, todo: toMigrate, skipped }))) {
      migrateStatus.value = null
      return
    }
    migrateStatus.value = t('hub.ui.categories.migrating_n', 'Migration de {n} cover(s)…', { n: toMigrate })
    migrateStatusClass.value = 'text-amber-600'
    const run: any = await $fetch('/api/bo/categories/migrate-webp', { method: 'POST' })
    const ok = (run.migrated || []).length
    const fail = (run.errors || []).length
    migrateStatus.value = fail === 0 ? t('hub.ui.categories.migrated_n', '{n} cover(s) migrée(s)', { n: ok }) : t('hub.ui.categories.migrated_errors', '{ok} OK, {fail} erreur(s)', { ok, fail })
    migrateStatusClass.value = fail === 0 ? 'text-emerald-600' : 'text-amber-600'
    if (fail > 0) console.warn('[migrate-webp] errors:', run.errors)
    
    await load()
    setTimeout(() => { migrateStatus.value = null }, 8000)
  } catch (e: any) {
    migrateStatus.value = t('hub.ui.categories.failed', 'Échec : {msg}', { msg: e?.data?.message || e?.message || t('hub.ui.categories.network_error', 'erreur réseau') })
    migrateStatusClass.value = 'text-rose-600'
    setTimeout(() => { migrateStatus.value = null }, 8000)
  } finally {
    migrateLoading.value = false
  }
}

const seoFilter = ref('')
function seoIsIncomplete(status: any): boolean {
  return status === 'partial' || status === 'empty'
}
function matchSeoFilter(status: any): boolean {
  if (!seoFilter.value) return true
  if (seoFilter.value === 'incomplete') return seoIsIncomplete(status)
  return status === seoFilter.value
}
const incompleteCount = computed(() => categories.value.filter(c => seoIsIncomplete(c.seoStatus)).length)

function selectIncomplete() {
  for (const c of categories.value) {
    if (seoIsIncomplete(c.seoStatus)) {
      selected.add(c.id)
    }
  }
}

const allSelected = computed(() => visibleCategories.value.length > 0 && visibleCategories.value.every(c => selected.has(c.id)))
const someSelected = computed(() => visibleCategories.value.some(c => selected.has(c.id)))

function toggleSelect(c: any) {
  if (selected.has(c.id)) {
    selected.delete(c.id)
  } else {
    selected.add(c.id)
  }
}

function toggleAll() {
  if (allSelected.value) {
    visibleCategories.value.forEach(c => { selected.delete(c.id) })
  } else {
    visibleCategories.value.forEach(c => { selected.add(c.id) })
  }
}

async function bulkCover() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = t('hub.ui.categories.cover_queueing', 'Mise en queue de {n} cover(s)…', { n: selected.size })
  bulkStatusClass.value = 'text-amber-600'
  
  
  try {
    const res: any = await $fetch('/api/bo/categories/bulk-cover', {
      method: 'POST',
      body: { category_ids: [...selected] },
    })
    bulkStatus.value = res.message ?? t('hub.ui.categories.cover_queued', '{n} cover(s) en queue', { n: res.enqueued ?? 0 })
    bulkStatusClass.value = 'text-emerald-600'
  } catch (err: any) {
    bulkStatus.value = err?.data?.message || t('hub.ui.categories.cover_error', 'Erreur lors de la mise en queue des covers')
    bulkStatusClass.value = 'text-red-600'
  } finally {
    bulkLoading.value = false
    setTimeout(() => { bulkStatus.value = null }, 6000)
  }
}

async function bulkSeo() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = t('hub.ui.categories.seo_queueing', 'Mise en queue SEO de {n} catégorie(s)…', { n: selected.size })
  bulkStatusClass.value = 'text-sky-600'
  try {
    const res: any = await $fetch('/api/bo/categories/bulk-seo', {
      method: 'POST',
      body: { category_ids: [...selected] },
    })
    bulkStatus.value = res.message ?? t('hub.ui.categories.seo_queued', '{n} en queue SEO', { n: res.queued ?? 0 })
    bulkStatusClass.value = 'text-emerald-600'
    seoProgress.value?.start() 
  } catch (err: any) {
    if (err?.status === 403 || err?.data?.statusCode === 403) {
      bulkStatus.value = t('hub.ui.categories.pro_only', 'Réservé aux offres Pro/Enterprise')
    } else {
      bulkStatus.value = err?.data?.message || t('hub.ui.categories.seo_error', 'Erreur lors de la génération SEO')
    }
    bulkStatusClass.value = 'text-amber-600'
  }
  bulkLoading.value = false
  setTimeout(() => { bulkStatus.value = null }, 5000)
}

const nonTraduites = ref<string[]>([])

async function createCategory() {
  creating.value = true
  try {
    const res = await $fetch<{ langues?: { nonTraduites?: string[] } }>('/api/bo/categories/create', { method: 'POST', body: newCat })
    nonTraduites.value = res?.langues?.nonTraduites ?? []
    showCreate.value = false
    newCat.name = ''; newCat.parentId = 2
    await load()
  } finally { creating.value = false }
}

const catMap = computed(() => {
  const m: Record<number, string> = {}
  categories.value.forEach(c => { m[c.id] = c.name })
  return m
})

function parentName(id: number) { return catMap.value[id] || (id > 1 ? `#${id}` : t('hub.ui.categories.root', 'Racine')) }

const expanded = reactive(new Set<number>())

const childrenByParent = computed(() => {
  const m = new Map<number, number[]>()
  for (const c of categories.value) {
    if (!m.has(c.parentId)) m.set(c.parentId, [])
    m.get(c.parentId)!.push(c.id)
  }
  return m
})

function hasChildren(c: any): boolean {
  return (childrenByParent.value.get(c.id)?.length ?? 0) > 0
}

function toggleExpand(id: number) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}

const catsById = computed(() => {
  const m = new Map<number, any>()
  for (const c of categories.value) m.set(c.id, c)
  return m
})

function isVisible(c: any): boolean {
  if (c.depth <= 2) return true
  let pid = c.parentId
  while (pid && pid > 2) {
    if (!expanded.has(pid)) return false
    const parent = catsById.value.get(pid)
    if (!parent) return false
    pid = parent.parentId
  }
  return true
}

const visibleCategories = computed(() => {
  if (seoFilter.value) return categories.value.filter(c => matchSeoFilter(c.seoStatus))
  if (search.value.trim()) return categories.value
  return categories.value.filter(isVisible)
})

function expandAll() {
  for (const c of categories.value) {
    if (hasChildren(c)) expanded.add(c.id)
  }
}
function collapseAll() { expanded.clear() }

const draggedId = ref<number | null>(null)
const dragOverId = ref<number | null>(null)
const reorderStatus = ref<string | null>(null)
const reorderStatusClass = ref('text-violet-600')

function onRowDragStart(e: DragEvent, c: any) {
  draggedId.value = c.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(c.id))
  }
}
function onRowDragEnd() {
  draggedId.value = null
  dragOverId.value = null
}
function canDropOn(target: any): boolean {
  if (!draggedId.value || draggedId.value === target.id) return false
  const dragged = catsById.value.get(draggedId.value)
  if (!dragged) return false
  return dragged.parentId === target.parentId
}
function onRowDragOver(e: DragEvent, target: any) {
  if (!canDropOn(target)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverId.value = target.id
}
function onRowDragLeave(target: any) {
  if (dragOverId.value === target.id) dragOverId.value = null
}
async function onRowDrop(e: DragEvent, target: any) {
  e.preventDefault()
  const dragged = draggedId.value ? catsById.value.get(draggedId.value) : null
  draggedId.value = null
  dragOverId.value = null
  if (!dragged || !target || dragged.id === target.id || dragged.parentId !== target.parentId) return

  reorderStatus.value = t('hub.ui.categories.saving', 'Enregistrement…')
  reorderStatusClass.value = 'text-violet-600'
  try {
    await $fetch('/api/bo/categories/reorder', {
      method: 'PUT',
      body: { draggedId: dragged.id, targetId: target.id, placement: 'before' },
    })
    reorderStatus.value = t('hub.ui.categories.order_saved', 'Ordre enregistré')
    reorderStatusClass.value = 'text-emerald-600'
    await load()
  } catch (err: any) {
    reorderStatus.value = err?.data?.message || t('hub.ui.categories.reorder_failed', 'Échec du reorder')
    reorderStatusClass.value = 'text-red-500'
  } finally {
    setTimeout(() => { reorderStatus.value = null }, 3000)
  }
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  brokenImages.clear()
  thumbFallbackMap.clear()
  legacyCovergenMap.clear()
  try {
    const data = await $fetch<any>('/api/bo/categories', { query: { page: page.value, perPage: perPage.value, search: search.value } })
    categories.value = data.categories ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

onMounted(load)
</script>
