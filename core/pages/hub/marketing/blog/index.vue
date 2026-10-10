<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.blog_list.title', 'Articles de blog') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ total > 1 ? t('hub.ui.blog_list.count_other', '{count} articles', { count: total }) : t('hub.ui.blog_list.count_one', '{count} article', { count: total }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setStatus('')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === '' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.blog_list.all', 'Tous') }}</button>
          <button @click="setStatus('active')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.blog_list.online', 'En ligne') }}</button>
          <button @click="setStatus('draft')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 'draft' ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.blog_list.drafts', 'Brouillons') }}</button>
        </div>
        <HubLangSelector :aria-label="t('hub.ui.blog_list.aria_lang', 'Langue d\'affichage des articles')" />
        <input
          v-model="search"
          type="text"
          :placeholder="t('hub.ui.blog_list.ph_search', 'Titre, URL, catégorie…')"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <a
          href="/api/bo/marketing/blog/export"
          download
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.blog_list.tt_export', 'Télécharger tous les articles (CSV, langue master)')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          {{ t('hub.ui.blog_list.export', 'Exporter') }}
        </a>
        <button
          @click="importOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.blog_list.tt_import', 'Importer des articles depuis un CSV')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          {{ t('hub.ui.blog_list.import', 'Importer') }}
        </button>
        <NuxtLink
          to="/hub/marketing/blog/new"
          class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          {{ t('hub.ui.blog_list.new_article', '+ Nouvel article') }}
        </NuxtLink>
      </div>
    </header>

    <HubImportModal
      :open="importOpen"
      :title="t('hub.ui.blog_list.imp_title', 'Importer des articles')"
      :subtitle="t('hub.ui.blog_list.imp_sub', 'CSV — UPSERT par ID ou URL (slug). On ne touche qu\'aux métadonnées (titre, meta, catégorie, statut) — jamais au contenu rédactionnel.')"
      endpoint="/api/bo/marketing/blog/import"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['id', 'linkRewrite']"
      :create-missing-label="t('hub.ui.blog_list.imp_create', 'Créer les articles manquants')"
      :create-missing-hint="t('hub.ui.blog_list.imp_create_hint', 'Insère un article si l\'ID/slug n\'existe pas. Titre + catégorie (≠ racine) obligatoires pour créer.')"
      @close="importOpen = false"
      @done="load"
    />

    
    <Transition enter-active-class="transition duration-150" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-100" leave-to-class="-translate-y-2 opacity-0">
      <div v-if="selected.size > 0" class="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-200 dark:border-violet-800 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <span class="text-xs font-medium text-violet-700 dark:text-violet-300">
          {{ selected.size > 1 ? t('hub.ui.blog_list.sel_other', '{count} articles sélectionnés', { count: selected.size }) : t('hub.ui.blog_list.sel_one', '{count} article sélectionné', { count: selected.size }) }}
        </span>
        <button
          @click="bulkRedaction"
          :disabled="bulkLoading"
          class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
        >
          <svg v-if="bulkLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
          {{ t('hub.ui.blog_list.bulk_ai', 'Rédaction IA') }}
        </button>
        <button
          @click="bulkCover"
          :disabled="bulkLoading"
          class="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
          {{ t('hub.ui.blog_list.bulk_cover', 'Générer covers') }}
        </button>
        <button @click="selected.clear()" class="text-xs text-violet-500 hover:text-violet-700 transition-colors">{{ t('hub.ui.blog_list.deselect', 'Désélectionner') }}</button>
        <span v-if="bulkStatus" class="text-xs ml-auto" :class="bulkStatusClass">{{ bulkStatus }}</span>
      </div>
    </Transition>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.blog_list.pag_label', 'articles')"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium w-10">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="toggleAll"
                class="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
            </th>
            <th class="px-4 py-2.5 font-medium w-14">{{ t('hub.ui.blog_list.col_cover', 'Cover') }}</th>
            <th class="px-4 py-2.5 font-medium">#</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.blog_list.col_title', 'Titre') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.blog_list.col_cat', 'Catégorie') }}</th>
            <th class="px-4 py-2.5 font-medium text-center w-12">IA</th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.blog_list.col_status', 'Statut') }}</th>
          </tr>
          
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5">
              <button v-if="hasActiveColFilter" @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap" :title="t('hub.ui.blog_list.tt_reset', 'Réinitialiser')">×</button>
            </th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5"><input v-model="colFilters.fId" type="text" placeholder="#" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fTitle" type="text" :placeholder="t('hub.ui.blog_list.ph_title', 'Titre…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCategory" type="text" :placeholder="t('hub.ui.blog_list.ph_cat', 'Catégorie…')" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fStatus" class="filter-input">
                <option value="">{{ t('hub.ui.blog_list.all', 'Tous') }}</option>
                <option value="published">{{ t('hub.ui.blog_list.published', 'Publié') }}</option>
                <option value="draft">{{ t('hub.ui.blog_list.draft', 'Brouillon') }}</option>
              </select>
            </th>
          </tr>
        </thead>
        <tbody>
          <HubTableSkeletonRows v-if="loading && !pages.length" :rows="8" :colspan="7" />
          <tr v-else-if="!pages.length">
            <td colspan="7" class="text-center py-20 text-sm text-gray-400">{{ t('hub.ui.blog_list.none', 'Aucun article') }}</td>
          </tr>
          <tr
            v-else
            v-for="p in pages"
            :key="p.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors"
          >
            <td class="px-4 py-2.5" @click.stop>
              <input
                type="checkbox"
                :checked="selected.has(p.id)"
                @change="toggleSelect(p)"
                class="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
            </td>
            <td class="px-4 py-1.5 cursor-pointer" @click="openPage(p.id)">
              <img v-if="p.thumbUrl" :src="p.thumbUrl" :alt="p.title" class="w-12 h-7 object-cover rounded border border-gray-200 dark:border-slate-700" loading="lazy" />
              <span v-else class="w-12 h-7 rounded border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-300">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              </span>
            </td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400 cursor-pointer" @click="openPage(p.id)">#{{ p.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 font-medium truncate max-w-md cursor-pointer" @click="openPage(p.id)">
              {{ p.title || t('hub.ui.blog_list.untitled', '— Sans titre —') }}
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 cursor-pointer" @click="openPage(p.id)">
              {{ p.categoryName || t('hub.ui.blog_list.cat_n', 'Catégorie #{id}', { id: p.categoryId }) }}
            </td>
            <td class="px-4 py-2.5 text-center cursor-pointer" @click="openPage(p.id)">
              <span v-if="p.redactionStatus === 'done'" class="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-50 text-violet-600" :title="t('hub.ui.blog_list.tt_ai', 'Contenu généré par IA')">IA</span>
              <span v-else-if="p.redactionStatus === 'processing'" class="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-50 text-violet-400 animate-pulse" :title="t('hub.ui.blog_list.tt_proc', 'Rédaction en cours')">...</span>
              <span v-else-if="p.redactionStatus === 'pending'" class="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-500" :title="t('hub.ui.blog_list.tt_queue', 'En queue')">{{ t('hub.ui.blog_list.queue', 'file') }}</span>
              <span v-else class="text-[10px] text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-center cursor-pointer" @click="openPage(p.id)">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="p.active
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'"
              >
                {{ p.active ? t('hub.ui.blog_list.online', 'En ligne') : t('hub.ui.blog_list.draft', 'Brouillon') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.blog_list.pag_label', 'articles')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('intelligence')) {
  navigateTo('/hub/dashboard')
}

const { t } = useHubT()
const router = useRouter()
const { currentLangId } = useHubLang()

const pages = ref<any[]>([])
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

const { colFilters, hasActiveColFilter, clearColFilters } = useHubColFilters({
  initial: {
    fId: '',
    fTitle: '',
    fCategory: '',
    fStatus: '' as string,
  },
  onChange: () => { page.value = 1; load() },
})

const importOpen = ref(false)
const importTargetFields = computed(() => [
  { key: 'id', label: 'ID' },
  { key: 'linkRewrite', label: 'URL (slug)' },
  { key: 'title', label: t('hub.ui.blog_list.col_title', 'Titre') },
  { key: 'metaDescription', label: t('hub.ui.blog_list.f_meta', 'Meta description') },
  { key: 'categoryId', label: t('hub.ui.blog_list.f_catid', 'Catégorie ID') },
  { key: 'active', label: t('hub.ui.blog_list.f_active', 'Actif') },
  { key: 'indexation', label: t('hub.ui.blog_list.f_index', 'Indexation') },
])
const importFieldAliases: Record<string, string[]> = {
  id: ['id', 'id_cms'],
  linkRewrite: ['url', 'slug', 'link_rewrite', 'linkrewrite'],
  title: ['titre', 'title', 'meta_title', 'meta title', 'nom'],
  metaDescription: ['meta description', 'meta_description', 'description'],
  categoryId: ['categorie id', 'category id', 'id_cms_category', 'category', 'categorie'],
  active: ['actif', 'active', 'status', 'statut', 'en ligne'],
  indexation: ['indexation', 'index', 'noindex'],
}

const selected = reactive(new Set<number>())
const selectedArticles = reactive(new Map<number, { title: string; linkRewrite: string }>())
const bulkLoading = ref(false)
const bulkStatus = ref<string | null>(null)
const bulkStatusClass = ref('text-violet-600')

const allSelected = computed(() => pages.value.length > 0 && pages.value.every(p => selected.has(p.id)))
const someSelected = computed(() => pages.value.some(p => selected.has(p.id)))

function toggleSelect(p: any) {
  if (selected.has(p.id)) {
    selected.delete(p.id)
    selectedArticles.delete(p.id)
  } else {
    selected.add(p.id)
    selectedArticles.set(p.id, { title: p.title, linkRewrite: p.linkRewrite })
  }
}

function toggleAll() {
  if (allSelected.value) {
    pages.value.forEach(p => {
      selected.delete(p.id)
      selectedArticles.delete(p.id)
    })
  } else {
    pages.value.forEach(p => {
      selected.add(p.id)
      selectedArticles.set(p.id, { title: p.title, linkRewrite: p.linkRewrite })
    })
  }
}

async function bulkRedaction() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = t('hub.ui.blog_list.q_articles', 'Mise en queue de {count} article(s)…', { count: selected.size })
  bulkStatusClass.value = 'text-violet-600'
  let ok = 0
  let fail = 0

  for (const id of selected) {
    const info = selectedArticles.get(id)
    if (!info) continue
    try {
      await $fetch('/api/bo/marketing/blog/generate-content', {
        method: 'POST',
        body: {
          id_cms: id,
          title: info.title,
          slug: info.linkRewrite,
        },
      })
      ok++
    } catch {
      fail++
    }
  }

  bulkLoading.value = false
  if (fail === 0) {
    bulkStatus.value = t('hub.ui.blog_list.q_articles_ok', '{count} article(s) en queue de rédaction IA', { count: ok })
    bulkStatusClass.value = 'text-emerald-600'
  } else {
    bulkStatus.value = t('hub.ui.blog_list.q_partial', '{ok} en queue, {fail} erreur(s)', { ok: ok, fail: fail })
    bulkStatusClass.value = 'text-amber-600'
  }
  setTimeout(() => { bulkStatus.value = null }, 5000)
}

async function bulkCover() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = t('hub.ui.blog_list.q_covers', 'Mise en queue de {count} cover(s)…', { count: selected.size })
  bulkStatusClass.value = 'text-amber-600'
  let ok = 0
  let fail = 0

  for (const id of selected) {
    const info = selectedArticles.get(id)
    if (!info) continue
    try {
      await $fetch('/api/bo/marketing/blog/generate-cover', {
        method: 'POST',
        body: {
          id_cms: id,
          title: info.title,
          slug: info.linkRewrite,
        },
      })
      ok++
    } catch {
      fail++
    }
  }

  bulkLoading.value = false
  if (fail === 0) {
    bulkStatus.value = t('hub.ui.blog_list.q_covers_ok', '{count} cover(s) en queue de génération', { count: ok })
    bulkStatusClass.value = 'text-emerald-600'
  } else {
    bulkStatus.value = t('hub.ui.blog_list.q_partial', '{ok} en queue, {fail} erreur(s)', { ok: ok, fail: fail })
    bulkStatusClass.value = 'text-amber-600'
  }
  setTimeout(() => { bulkStatus.value = null }, 5000)
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

function setStatus(s: string) {
  statusFilter.value = s
  page.value = 1
  load()
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

function openPage(id: number) {
  router.push(`/hub/marketing/blog/${id}`)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/marketing/blog', {
      query: {
        page: page.value,
        perPage: perPage.value,
        search: search.value,
        status: statusFilter.value,
        lang: currentLangId.value,
        fId: colFilters.fId || undefined,
        fTitle: colFilters.fTitle || undefined,
        fCategory: colFilters.fCategory || undefined,
        fStatus: colFilters.fStatus || undefined,
      },
    })
    pages.value = data.pages ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }

onMounted(load)

watch(currentLangId, (n, o) => {
  if (n !== o) { page.value = 1; load() }
})
</script>
