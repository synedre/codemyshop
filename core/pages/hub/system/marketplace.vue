<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.system_marketplace.title', 'Marketplace') }}</h1>
          <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.ui.system_marketplace.subtitle', '{count} module(s) actif(s) sur {total} · Thème : {theme}', { count: enabledCount, total: features.length, theme: activeTheme.name }) }}</p>
        </div>
        
        <div class="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            @click="activeTab = 'apps'"
            :class="['px-4 py-1.5 rounded-md text-xs font-semibold transition-all',
              activeTab === 'apps' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700']"
          >
            {{ t('hub.ui.system_marketplace.tab_apps', 'Applications') }}
          </button>
          <button
            @click="activeTab = 'themes'"
            :class="['px-4 py-1.5 rounded-md text-xs font-semibold transition-all',
              activeTab === 'themes' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700']"
          >
            {{ t('hub.ui.system_marketplace.tab_themes', 'Design Systems') }}
          </button>
        </div>
      </div>
      
      <div v-if="activeTab === 'apps'" class="flex flex-wrap items-center gap-2 mt-3">
        <button @click="filter = 'all'"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300']">
          {{ t('hub.ui.system_marketplace.all', 'Toutes') }}
        </button>

        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 ml-2">{{ t('hub.ui.system_marketplace.transversal', 'Transversal') }}</span>
        <button v-for="cat in HORIZONTAL_CATEGORIES" :key="cat.id" @click="filter = cat.id"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            filter === cat.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300']">
          {{ cat.label }}
        </button>

        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 ml-2">{{ t('hub.ui.system_marketplace.vertical', 'Verticale métier') }}</span>
        <button v-for="cat in VERTICAL_CATEGORIES" :key="cat.id" @click="filter = cat.id"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
            filter === cat.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-300 hover:border-amber-300']">
          {{ cat.label }}
        </button>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto">

      
      <template v-if="activeTab === 'apps'">

      
      <div v-if="!loaded" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5 animate-pulse">
          <div class="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl mb-3" />
          <div class="h-4 bg-gray-100 dark:bg-slate-800 rounded w-2/3 mb-2" />
          <div class="h-3 bg-gray-50 rounded w-full mb-1" />
          <div class="h-3 bg-gray-50 rounded w-4/5" />
        </div>
      </div>

      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="f in filtered"
          :key="f.id"
          class="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          :class="f.enabled ? 'border-primary-200' : 'border-gray-100 dark:border-slate-800'"
        >
          <div class="p-5">
            
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  :class="f.enabled ? 'bg-primary-100' : 'bg-gray-100 dark:bg-slate-800'">
                  {{ f.icon }}
                </div>
                <div>
                  <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ f.name }}</p>
                  <span
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    :class="badgeClass(f)"
                  >{{ f.badge || f.status }}</span>
                </div>
              </div>
              
              <button
                v-if="isOwner"
                type="button"
                @click="toggle(f)"
                :disabled="toggling === f.id"
                :class="[
                  f.enabled ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-200 dark:bg-slate-700',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50',
                ]"
              >
                <span
                  aria-hidden="true"
                  :class="[
                    f.enabled ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  ]"
                />
              </button>
            </div>

            
            <p class="text-xs text-gray-500 leading-relaxed mb-3">{{ f.description }}</p>

            
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold" :class="f.monthlyPrice > 0 ? 'text-primary-600' : 'text-success-600'">
                {{ f.monthlyPrice > 0 ? t('hub.ui.system_marketplace.price_month', '{price}€/mois', { price: f.monthlyPrice }) : t('hub.ui.system_marketplace.free', 'Gratuit') }}
              </span>
              <NuxtLink
                v-if="f.enabled && f.route"
                :to="f.route"
                class="text-[10px] font-semibold text-primary-600 hover:text-primary-700"
              >
                {{ t('hub.ui.system_marketplace.open', 'Ouvrir →') }}
              </NuxtLink>
              <span v-else-if="f.status === 'planned'" class="text-[10px] text-gray-400 italic">
                {{ t('hub.ui.system_marketplace.in_dev', 'En cours de dev') }}
              </span>
            </div>
          </div>

          
          <div v-if="f.enabled" class="h-1 bg-primary-500" />
        </div>
      </div>

      </template>

      
      <template v-if="activeTab === 'themes'">

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="ds in dsCatalog"
          :key="ds.id"
          class="relative bg-white dark:bg-slate-900 rounded-2xl border-2 overflow-hidden transition-all duration-300"
          :class="dsActiveId === ds.id
            ? 'border-primary-500 shadow-[0_0_20px_rgba(79,70,229,0.12)]'
            : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'"
        >
          
          <div v-if="dsActiveId === ds.id" class="absolute top-3 right-3">
            <span class="bg-primary-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              {{ t('hub.ui.system_marketplace.active_badge', 'Actif') }}
            </span>
          </div>

          
          <div class="h-32 relative overflow-hidden" :class="ds.tokens.bgWow">
            <div class="absolute inset-0" :class="ds.tokens.bgWowDark" />
            
            <div v-if="ds.tokens.orbRose" class="absolute -top-8 -left-8 w-32 h-32 rounded-full" :class="ds.tokens.orbRose" />
            <div v-if="ds.tokens.orbViolet" class="absolute top-2 right-[-20px] w-24 h-24 rounded-full" :class="ds.tokens.orbViolet" />
            
            <div class="absolute bottom-3 left-4 right-4">
              <div class="rounded-lg p-3 text-[10px]" :class="[ds.tokens.cardGlass, ds.tokens.cardGlassDark]">
                <div class="h-2 rounded-full w-2/3 mb-1.5 bg-gray-300 dark:bg-slate-600" />
                <div class="h-1.5 rounded-full w-full bg-gray-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>

          <div class="p-5">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-1">{{ ds.name }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-4">{{ ds.description }}</p>

            
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                {{ ds.tokens.orbRose ? t('hub.ui.system_marketplace.orbs', 'Orbes') : t('hub.ui.system_marketplace.no_orbs', 'Pas d\'orbes') }}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                {{ ds.tokens.cardGlass.includes('backdrop-blur') ? t('hub.ui.system_marketplace.glass', 'Glassmorphism') : t('hub.ui.system_marketplace.solid', 'Solid cards') }}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                {{ ds.tokens.bgWow.includes('gradient') ? t('hub.ui.system_marketplace.gradients', 'Gradients') : t('hub.ui.system_marketplace.flat', 'Fonds plats') }}
              </span>
            </div>

            
            <button
              v-if="dsActiveId !== ds.id && isOwner"
              @click="activateTheme(ds.id)"
              :disabled="dsActivating === ds.id"
              class="w-full px-4 py-2 text-xs font-semibold rounded-lg border border-primary-200 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-600/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg v-if="dsActivating === ds.id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              {{ dsActivating === ds.id ? t('hub.ui.system_marketplace.activating', 'Activation...') : t('hub.ui.system_marketplace.activate', 'Activer ce thème') }}
            </button>
            <div v-else-if="dsActiveId === ds.id" class="w-full px-4 py-2 text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-600/10 text-primary-600 dark:text-primary-400 text-center">
              {{ t('hub.ui.system_marketplace.theme_active', 'Thème actif') }}
            </div>
          </div>
        </div>
      </div>

      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { CatalogFeatureWithState } from '~/composables/useFeatureFlag'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()
const { isOwner } = useRoles()
const { features, loaded, loadFeatures, toggleFeature } = useFeatureFlag()
const { catalog: dsCatalog, activeTheme, activeThemeId: dsActiveId, loadDesignSystems, setTheme } = useDesignSystem()

const activeTab = ref('apps')
const filter    = ref('all')
const toggling  = ref<string | null>(null)
const dsActivating = ref<string | null>(null)

const HORIZONTAL_CATEGORIES = computed(() => [
  { id: 'marketing',    label: t('hub.ui.system_marketplace.cat_marketing', 'Marketing') },
  { id: 'content',      label: t('hub.ui.system_marketplace.cat_content', 'Contenu') },
  { id: 'growth',       label: t('hub.ui.system_marketplace.cat_growth', 'Croissance') },
  { id: 'intelligence', label: t('hub.ui.system_marketplace.cat_intelligence', 'Intelligence') },
  { id: 'finance',      label: t('hub.ui.system_marketplace.cat_finance', 'Finance') },
  { id: 'procurement',  label: t('hub.ui.system_marketplace.cat_procurement', 'Achats') },
  { id: 'support',      label: t('hub.ui.system_marketplace.cat_support', 'Support') },
  { id: 'logistique',   label: t('hub.ui.system_marketplace.cat_logistics', 'Logistique') },
  { id: 'homepage',     label: t('hub.ui.system_marketplace.cat_homepage', 'Homepage') },
  { id: 'system',       label: t('hub.ui.system_marketplace.cat_system', 'Système') },
])

const VERTICAL_CATEGORIES = computed(() => [
  { id: 'food',         label: t('hub.ui.system_marketplace.cat_food', '🍅 Agroalimentaire') },
])

const enabledCount = computed(() => features.value.filter(f => f.enabled).length)

const filtered = computed(() =>
  filter.value === 'all' ? features.value : features.value.filter(f => f.category === filter.value)
)

async function toggle(f: CatalogFeatureWithState) {
  toggling.value = f.id
  try {
    await toggleFeature(f.id, !f.enabled)
  } catch (e) { console.error(e) }
  finally { toggling.value = null }
}

async function activateTheme(themeId: string) {
  dsActivating.value = themeId
  try {
    setTheme(themeId)
  } finally {
    dsActivating.value = null
  }
}

function badgeClass(f: CatalogFeatureWithState) {
  if (f.badge === 'Premium')  return 'bg-amber-50 text-amber-600 border border-amber-100'
  if (f.badge === 'Inclus')   return 'bg-success-50 text-success-600 border border-success-100'
  if (f.badge === 'Add-on')   return 'bg-primary-50 text-primary-600 border border-primary-100'
  if (f.badge === 'Beta')     return 'bg-violet-50 text-violet-600 border border-violet-100'
  if (f.status === 'planned') return 'bg-gray-100 dark:bg-slate-800 text-gray-500'
  return 'bg-gray-50 text-gray-500'
}

onMounted(async () => {
  await Promise.all([loadFeatures(), loadDesignSystems()])
})
</script>
