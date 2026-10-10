<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-8 py-6 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.title', 'Contexte de marque') }}</h1>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          {{ t('hub.ui.brand_os.intro', 'La source unique lue par tous les moteurs IA — rédaction SEO (catégories, produits), articles de blog, et votre IA branchée en MCP. Ce que vous décrivez ici cadre le contenu et évite les hors-sujet.') }}
        </p>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-8 py-8">
      <div class="bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.facts_title', 'Faits vérifiés de la marque') }}</h3>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.facts_hint', 'Seuls ces faits peuvent être affirmés par l\'IA dans le contenu généré (anti-hallucination). Activité, ancienneté, spécialités, clientèle.') }}</p>
          <textarea v-model="seoBrief.facts" rows="4" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" :placeholder="t('hub.ui.brand_os.facts_ph', 'Ex : entreprise fondée en …, spécialisée en …, ce qui vous distingue')" />
        </div>
        <div>
          <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.topics_title', 'Angles du métier') }}</h3>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.topics_hint', 'Les sujets que le contenu doit couvrir, propres à votre secteur (séparés par des virgules).') }}</p>
          <textarea v-model="seoBrief.sector_topics" rows="3" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" :placeholder="t('hub.ui.brand_os.topics_ph', 'Ex : les grands thèmes de votre métier (usages, conseils, choix produit…)')" />
        </div>
        <div>
          <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.audience_title', 'Audience cible (impératif)') }}</h3>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.audience_hint', 'À qui s\'adresse le contenu, et ce qui est EXCLU. Injecté dans tous les prompts (catégories, produits, blog) et servi à votre IA branchée. Ex : « B2B exclusif réservé aux pros avec SIRET — NE PAS rédiger pour des particuliers ».') }}</p>
          <textarea v-model="seoBrief.audience" rows="4" maxlength="2000" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" :placeholder="t('hub.ui.brand_os.audience_ph', 'Ex : Site B2B exclusif (CHR, restaurateurs, épiceries fines). Conditionnement mini 5 kg. NE PAS rédiger pour des particuliers.')" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.forbidden_title', 'Mots / allégations interdits') }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.forbidden_hint', 'Ne seront jamais employés par l\'IA, même vrais (anti-hallucination).') }}</p>
            <textarea v-model="seoBrief.forbidden_words" rows="3" maxlength="1000" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" :placeholder="t('hub.ui.brand_os.forbidden_ph', 'Ex : bio, AOP, sans gluten, 100 % naturel…')" />
          </div>
          <div>
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.tone_title', 'Ton rédactionnel') }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.tone_hint', 'Le registre de votre marque (expertise, vocabulaire, vouvoiement…).') }}</p>
            <textarea v-model="seoBrief.tone" rows="3" maxlength="1000" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" :placeholder="t('hub.ui.brand_os.tone_ph', 'Ex : expert et factuel, vocabulaire métier (HACCP, sourcing, lots), vouvoiement.')" />
          </div>
        </div>
        <NuxtLink to="/hub/ai/avatars" class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 px-4 py-3 hover:border-primary-300 transition-colors">
          <span class="text-xs text-gray-600 dark:text-slate-300"><span class="font-semibold">{{ t('hub.ui.brand_os.avatars_title', 'Avatars acheteurs') }}</span> {{ t('hub.ui.brand_os.avatars_text', '— les personas ciblés par avatar/article (douleurs, objectifs, ton, posture par type de page).') }}</span>
          <span class="text-xs font-semibold text-primary-600 dark:text-primary-400 shrink-0">{{ t('hub.ui.brand_os.manage', 'Gérer →') }}</span>
        </NuxtLink>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.authority_title', 'Lien d\'autorité (EEAT)') }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.authority_hint', 'Site de référence externe cité dans les pages (organisme officiel du secteur).') }}</p>
            <input v-model="seoBrief.authority_url" type="url" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" placeholder="https://…" />
          </div>
          <div>
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.brand_os.label_title', 'Libellé du lien') }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2">{{ t('hub.ui.brand_os.label_hint', 'Texte affiché pour ce lien.') }}</p>
            <input v-model="seoBrief.authority_label" type="text" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-700 dark:text-slate-200" :placeholder="t('hub.ui.brand_os.label_ph', 'Ex : organisme officiel de référence de votre secteur')" />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button @click="saveSeoBrief" :disabled="seoSaving"
            class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50">
            {{ seoSaving ? t('hub.ui.brand_os.saving', 'Enregistrement…') : t('hub.ui.brand_os.save', 'Enregistrer') }}
          </button>
          <span v-if="seoSavedAt" class="text-xs text-primary-600 dark:text-primary-400">{{ t('hub.ui.brand_os.saved', '✓ Enregistré') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })
const { t } = useHubT()

const seoBrief = reactive({
  facts: '', sector_topics: '', authority_url: '', authority_label: '',
  audience: '', forbidden_words: '', tone: '',
})
const seoSaving = ref(false)
const seoSavedAt = ref<number | null>(null)

async function loadSeoBrief() {
  try {
    const res = await $fetch<{ brief: typeof seoBrief }>('/api/bo/brand-brief')
    Object.assign(seoBrief, res.brief)
  } catch {  }
}

async function saveSeoBrief() {
  seoSaving.value = true
  try {
    await $fetch('/api/bo/brand-brief', { method: 'PUT', body: { ...seoBrief } })
    seoSavedAt.value = Date.now()
  } finally {
    seoSaving.value = false
  }
}

onMounted(loadSeoBrief)
</script>
