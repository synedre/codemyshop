
<script setup lang="ts">
import { useMarchesOuverts } from '~/composables/useMarchesOuverts'

definePageMeta({ layout: false })

const { t: i18nt } = useI18nField()

const { t } = useT()

const _cfg = useRuntimeConfig()
const pub = _cfg.public as Record<string, any>

const brandName = String(pub.brandName ?? '')
const siteUrl = String(pub.psFrontUrl ?? '')
const contactEmail = String(pub.contactEmail ?? '')
const contactPhone = String(pub.contactPhone ?? '')
const contactDescription = String(pub.contactDescription ?? '')
const socialLinks = Array.isArray(pub.socialLinks) ? pub.socialLinks : []
const logoPath = String(pub.logoPath ?? '/logo.svg')
const localBusiness = pub.localBusiness ?? null

const metaTitleFallback = String(pub.metaTitle ?? (brandName ? `${brandName} — ${contactDescription.slice(0, 80)}` : ''))

const heroH1Config = String(pub.heroH1 ?? brandName)
const heroH1 = computed(() => t('home.hero_h1', heroH1Config))

const { activeLang: sectionsLang } = useRouteLang()

const route = useRoute()
const previewVariant = computed(() => {
  const hp = route.query.hp
  return typeof hp === 'string' && hp ? hp : undefined
})

const { data: sectionsData } = await useFetch<{ sections: Array<{ id: number; position: number; type: string; title: string | null; subtitle: string | null; payload: any; active: boolean }> }>('/api/homepage-sections', {
  query: { lang: sectionsLang, hp: previewVariant },
  watch: [sectionsLang, previewVariant],
  default: () => ({ sections: [] }),
})

const { data: pageMeta } = await useFetch<{ title: string | null; description: string | null }>('/api/page-meta', {
  query: { page: 'index', lang: sectionsLang },
  watch: [sectionsLang],
  default: () => ({ title: null, description: null }),
})

const metaTitle = computed(() => String(pageMeta.value?.title || metaTitleFallback))
const metaDescription = computed(() => String(pageMeta.value?.description || contactDescription))

const editorDbSections = useDbHomepageSections()

const dbSections = computed(() => {
  if (editorDbSections.value.length > 0) {
    return [...editorDbSections.value]
      .filter(s => s.active)
      .sort((a, b) => a.position - b.position)
  }
  return sectionsData.value?.sections?.filter(s => s.active !== false) ?? []
})

function findDb(type: string): any {
  return dbSections.value.find(s => s.type === type) ?? null
}

function resolveI18n(value: any, fallback: string = ''): string {
  if (!value) return fallback
  if (typeof value === 'object') return i18nt(value) || fallback
  if (typeof value === 'string') {
    
    
    const trimmed = value.trimStart()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        if (typeof parsed === 'object' && parsed !== null) return i18nt(parsed) || fallback
      } catch {  }
    }
    return value || fallback
  }
  return fallback
}

const heroSection = computed(() => {
  const s = findDb('hero')
  return s ? { ...s.payload, title: resolveI18n(s.title, s.payload?.title), subtitle: resolveI18n(s.subtitle, s.payload?.subtitle) } : null
})

const hasVisibleH1Hero = computed(() => !!heroSection.value || dbSections.value.some(s => s.type === 'hero-cta'))

const LOCALE_BCP47: Record<string, string> = { fr: 'fr-FR', en: 'en-US', de: 'de-DE' }
const localeBcp47 = computed(() => LOCALE_BCP47[String(sectionsLang.value || 'fr')] ?? 'fr-FR')

const organizationLd = computed<Record<string, unknown>>(() => buildOrganizationNode({
  siteUrl,
  brandName,
  logoPath,
  contactEmail,
  contactPhone,
  
  
  description: metaDescription.value,
  socialLinks,
  
  
  organizationLegal: pub.organizationLegal,
}))

const websiteLd = computed(() => ({
  '@type': 'WebSite',
  '@id': `${siteUrl}#website`,
  url: siteUrl,
  name: brandName,
  publisher: { '@id': `${siteUrl}#organization` },
  inLanguage: localeBcp47.value,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/recherche?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}))

const businessLocationNodes = computed(() => buildBusinessLocationNodes({
  siteUrl,
  brandName,
  logoPath,
  contactEmail,
  contactPhone,
  localBusiness,
  businessLocations: pub.businessLocations,
}))

const graph = computed<unknown[]>(() => {
  const g: unknown[] = [organizationLd.value, websiteLd.value]
  g.push(...businessLocationNodes.value)
  return g
})

const ogLocaleAlternates = useMarchesOuverts()
  .filter((l: string) => l !== String(sectionsLang.value || 'fr'))
  .map((l: string) => LOCALE_BCP47[l])
  .filter(Boolean)
  .map((l: string) => ({ property: 'og:locale:alternate', content: l }))

const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@graph': graph.value,
}))

useHead({
  title: metaTitle,
  meta: [
    { name: 'description', content: metaDescription },
    
    
    { property: 'og:locale', content: localeBcp47 },
    ...ogLocaleAlternates,
  ],
  script: [
    { type: 'application/ld+json', innerHTML: () => JSON.stringify(jsonLd.value) },
  ],
})
</script>

<template>
  <NuxtLayout name="white-label">
    
    <h1 v-if="!hasVisibleH1Hero" class="sr-only">{{ heroH1 }}</h1>

    
    <PageSections :sections="dbSections" />
  </NuxtLayout>
</template>
