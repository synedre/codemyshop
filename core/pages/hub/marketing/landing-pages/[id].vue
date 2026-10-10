<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/marketing/landing-pages" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? t('hub.ui.marketing_landing_pages_detail.new_page', 'Nouvelle page') : (form.title || t('hub.ui.marketing_landing_pages_detail.untitled', '— Sans titre —')) }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }}</span>
          <span v-if="form.linkRewrite" class="ml-2 font-mono">/{{ form.linkRewrite }}</span>
          <span v-if="!isMaster" class="ml-2 inline-flex items-center gap-1 text-amber-600">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            {{ t('hub.ui.marketing_landing_pages_detail.translation_locked', 'Traduction — structure verrouillée') }}
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <HubLangSelector :aria-label="t('hub.ui.marketing_landing_pages_detail.edit_lang', 'Langue d\'édition de la page')" />
        <span v-if="saved" class="text-xs text-green-600 font-medium">{{ t('hub.ui.marketing_landing_pages_detail.saved', 'Sauvegardé') }}</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">{{ saveError }}</span>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? t('hub.ui.marketing_landing_pages_detail.saving', 'Enregistrement…') : (isNew ? t('hub.ui.marketing_landing_pages_detail.create', 'Créer') : t('hub.ui.marketing_landing_pages_detail.save', 'Enregistrer')) }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8">
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="h-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-96 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-40 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <div v-else-if="loaded" class="px-6 py-6">
      <div class="max-w-4xl mx-auto space-y-6">

        
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.marketing_landing_pages_detail.seo_url', 'SEO & URL') }}</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ t('hub.ui.marketing_landing_pages_detail.seo_hint', 'Le titre, la méta description et l\'URL sont traduits par langue.') }}
            </p>
          </header>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                {{ t('hub.ui.marketing_landing_pages_detail.page_title', 'Titre de la page') }}
                <span class="text-[10px] text-gray-400 font-normal">({{ currentLang?.iso_code?.toUpperCase() || 'FR' }})</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                :placeholder="t('hub.ui.marketing_landing_pages_detail.title_ph', 'Mentions légales')"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
              <p class="text-[10px] text-gray-400 mt-1">{{ (form.title || '').length }} / 255</p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ t('hub.ui.marketing_landing_pages_detail.meta_desc', 'Méta description') }}</label>
              <textarea
                v-model="form.metaDescription"
                rows="3"
                :placeholder="t('hub.ui.marketing_landing_pages_detail.meta_ph', 'Résumé affiché dans les résultats Google (~160 caractères)')"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
              <p class="text-[10px] text-gray-400 mt-1">{{ (form.metaDescription || '').length }} / 512</p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ t('hub.ui.marketing_landing_pages_detail.friendly_url', 'URL simplifiée') }}</label>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 font-mono">/content/</span>
                <input
                  v-model="form.linkRewrite"
                  type="text"
                  :placeholder="t('hub.ui.marketing_landing_pages_detail.slug_ph', 'mentions-legales')"
                  class="flex-1 text-sm font-mono border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                  @blur="form.linkRewrite = slugify(form.linkRewrite)"
                />
              </div>
              <p class="text-[10px] text-gray-400 mt-1">
                {{ t('hub.ui.marketing_landing_pages_detail.slug_hint', 'Automatiquement normalisé en lowercase + tirets (a-z, 0-9, -).') }}
              </p>
            </div>
          </div>
        </section>

        
        <HubSeoStatusControl v-if="!isNew && form.id > 0" entity="cms" :id="form.id" />

        
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.marketing_landing_pages_detail.content', 'Contenu') }}</h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.ui.marketing_landing_pages_detail.content_hint', 'Article de blog, page légale ou contenu SEO. HTML autorisé.') }}</p>
            </div>
            <div class="flex items-center gap-1">
              <button
                v-for="tool in toolbar"
                :key="tool.cmd + (tool.value || '')"
                type="button"
                @mousedown.prevent="exec(tool.cmd, tool.value)"
                :title="tool.label"
                class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
              >
                {{ tool.icon }}
              </button>
              <button
                type="button"
                @mousedown.prevent="promptLink"
                :title="t('hub.ui.marketing_landing_pages_detail.link', 'Lien')"
                class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
              >
                🔗
              </button>
              <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-slate-700" />
              <button
                type="button"
                @click="mode = mode === 'wysiwyg' ? 'html' : 'wysiwyg'"
                :class="mode === 'html' ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800' : 'text-gray-600 dark:text-slate-300 border-transparent hover:border-gray-200 dark:hover:border-slate-700'"
                class="text-[10px] uppercase tracking-wide px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                {{ mode === 'html' ? 'HTML' : 'RICH' }}
              </button>
            </div>
          </header>

          <div
            v-if="mode === 'wysiwyg'"
            ref="editorEl"
            contenteditable="true"
            class="min-h-[320px] w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/40 prose prose-sm dark:prose-invert max-w-none overflow-auto"
            @input="onEditorInput"
            @blur="onEditorInput"
          />
          <textarea
            v-else
            v-model="form.content"
            rows="20"
            :placeholder="t('hub.ui.marketing_landing_pages_detail.html_ph', '<p>Contenu HTML brut…</p>')"
            class="w-full text-xs font-mono border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />

          <p class="text-[10px] text-gray-400 mt-2">
            {{ t('hub.ui.marketing_landing_pages_detail.char_count', '{count} caractères texte — bascule HTML pour éditer le markup brut.', { count: plainTextLength }) }}
          </p>
        </section>

        
        
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.marketing_landing_pages_detail.settings', 'Paramètres') }}</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ t('hub.ui.marketing_landing_pages_detail.settings_hint', 'Publication. Non modifiable depuis une traduction — repassez en {lang}.', { lang: defaultLangLabel }) }}
            </p>
          </header>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ t('hub.ui.marketing_landing_pages_detail.status', 'Statut') }}</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="!isMaster"
                  @click="form.active = !form.active"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40"
                  :class="form.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="form.active ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
                <span class="text-xs text-gray-600 dark:text-slate-300">
                  {{ form.active ? t('hub.ui.marketing_landing_pages_detail.online', 'En ligne') : t('hub.ui.marketing_landing_pages_detail.draft', 'Brouillon') }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">{{ t('hub.ui.marketing_landing_pages_detail.not_found', 'Page introuvable.') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('intelligence')) {
  navigateTo('/hub/dashboard')
}

const { t } = useHubT()
const route = useRoute()
const router = useRouter()

const { currentLangId, currentLang, isDefault, langs } = useHubLang()
const isMaster = computed(() => isDefault.value)

const defaultLangLabel = computed(() => {
  const l = langs.value.find((x: any) => x.is_default)
  return l?.name || t('hub.ui.marketing_landing_pages_detail.master_lang', 'langue master')
})

const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const isNew = ref(false)

const form = reactive({
  id: 0,
  title: '',
  metaDescription: '',
  linkRewrite: '',
  content: '',
  
  
  
  categoryId: 1,
  active: false,
})

const mode = ref<'wysiwyg' | 'html'>('wysiwyg')
const editorEl = ref<HTMLElement | null>(null)

const toolbar = computed(() => [
  { cmd: 'bold', label: t('hub.ui.marketing_landing_pages_detail.tb_bold', 'Gras (Ctrl+B)'), icon: 'B' },
  { cmd: 'italic', label: t('hub.ui.marketing_landing_pages_detail.tb_italic', 'Italique (Ctrl+I)'), icon: 'I' },
  { cmd: 'formatBlock', value: 'H2', label: t('hub.ui.marketing_landing_pages_detail.tb_h2', 'Titre H2'), icon: 'H2' },
  { cmd: 'formatBlock', value: 'H3', label: t('hub.ui.marketing_landing_pages_detail.tb_h3', 'Titre H3'), icon: 'H3' },
  { cmd: 'insertUnorderedList', label: t('hub.ui.marketing_landing_pages_detail.tb_ul', 'Liste à puces'), icon: '•' },
  { cmd: 'insertOrderedList', label: t('hub.ui.marketing_landing_pages_detail.tb_ol', 'Liste numérotée'), icon: '1.' },
  { cmd: 'removeFormat', label: t('hub.ui.marketing_landing_pages_detail.tb_clear', 'Effacer format'), icon: '⟲' },
])

function exec(cmd: string, value?: string) {
  if (typeof document === 'undefined') return
  editorEl.value?.focus()
  document.execCommand(cmd, false, value)
  onEditorInput()
}

function promptLink() {
  if (typeof document === 'undefined') return
  const url = window.prompt(t('hub.ui.marketing_landing_pages_detail.link_prompt', 'URL du lien'), 'https://')
  if (!url) return
  editorEl.value?.focus()
  document.execCommand('createLink', false, url)
  onEditorInput()
}

function onEditorInput() {
  if (!editorEl.value) return
  form.content = editorEl.value.innerHTML
}

const plainTextLength = computed(() => {
  if (typeof document === 'undefined') return (form.content || '').length
  const tmp = document.createElement('div')
  tmp.innerHTML = form.content || ''
  return (tmp.textContent || '').trim().length
})

watch(
  () => form.content,
  (html) => {
    if (mode.value !== 'wysiwyg' || !editorEl.value) return
    if (editorEl.value.innerHTML !== (html || '')) {
      editorEl.value.innerHTML = html || ''
    }
  },
)

watch(mode, (m) => {
  nextTick(() => {
    if (m === 'wysiwyg' && editorEl.value) {
      editorEl.value.innerHTML = form.content || ''
    }
  })
})

function slugify(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
}

async function load() {
  loading.value = true
  loaded.value = false
  try {
    const data = await $fetch<any>(`/api/bo/marketing/landing-pages/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    const p = data.page
    isNew.value = !!data.isNew
    form.id = Number(p.id) || 0
    form.title = p.title || ''
    form.metaDescription = p.metaDescription || ''
    form.linkRewrite = p.linkRewrite || ''
    form.content = p.content || ''
    form.categoryId = Number(p.categoryId) || 1
    form.active = !!Number(p.active)
    
    nextTick(() => {
      if (editorEl.value) editorEl.value.innerHTML = form.content || ''
    })
    loaded.value = true
  } catch (err) {
    console.error('Load CMS page error:', err)
    loaded.value = false
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    
    
    
    const payload: Record<string, any> = isMaster.value
      ? {
          title: form.title,
          metaDescription: form.metaDescription,
          linkRewrite: form.linkRewrite,
          content: form.content,
          categoryId: form.categoryId,
          active: form.active,
        }
      : {
          title: form.title,
          metaDescription: form.metaDescription,
          linkRewrite: form.linkRewrite,
          content: form.content,
        }

    const res = await $fetch<any>(`/api/bo/marketing/landing-pages/${route.params.id}`, {
      method: 'PUT',
      query: { lang: currentLangId.value },
      body: payload,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
    if (res?.created && res?.id) {
      router.replace(`/hub/marketing/landing-pages/${res.id}`)
    }
  } catch (err: any) {
    console.error('Save CMS page error:', err)
    saveError.value = err?.data?.message || err?.message || t('hub.ui.marketing_landing_pages_detail.save_failed', 'Échec de la sauvegarde')
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

onMounted(load)

watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value && route.params.id !== 'new') {
    load()
  }
})
</script>
