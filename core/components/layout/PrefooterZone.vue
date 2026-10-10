
<script setup lang="ts">
const { t: i18nt } = useI18nField()

const { t } = useT()

const _pubDbFlags = useRuntimeConfig().public
const isDbPrefooter = computed(() => resolveDbContentFlags(_pubDbFlags as any).dbPrefooterSections)

const hidePrefooterZone = computed(() => resolveDbContentFlags(_pubDbFlags as any).hidePrefooterFallback)

const { activeLang: pfLang } = useRouteLang()
const { data: pfData } = await useFetch<{ sections: any[] }>('/api/prefooter-sections', {
  query: { lang: pfLang },
  watch: [pfLang],
  default: () => ({ sections: [] }),
})

const editorPfSections = useDbPrefooterSections()

const pfSections = computed(() => {
  
  if (editorPfSections.value.length > 0) {
    return [...editorPfSections.value]
      .filter(s => s.active)
      .sort((a, b) => a.position - b.position)
  }
  
  return pfData.value?.sections?.filter((s: any) => s.active !== false) ?? []
})

const useDbMode = computed(() => isDbPrefooter.value && pfSections.value.length > 0)

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

function findPf(type: string): any {
  return pfSections.value.find((s: any) => s.type === type) ?? null
}

const reviewsSection = computed(() => {
  const s = findPf('customer-reviews')
  return s ? {
    title: resolveI18n(s.title, t('reviews.heading', 'Nos clients parlent de nous')),
    limit: s.limitItems ?? 6,
  } : null
})
</script>

<template>
  
  <template v-if="!hidePrefooterZone">
    
    <template v-if="useDbMode">
      <template v-for="section in pfSections" :key="section.id">
        <LazyCustomerReviews
          v-if="section.type === 'customer-reviews'"
          :title="reviewsSection?.title ?? t('reviews.heading', 'Nos clients parlent de nous')"
          :limit="reviewsSection?.limit ?? 6"
          layout="slider"
        />
      </template>
    </template>

    
    <LazyCustomerReviews v-else :title="t('reviews.heading', 'Nos clients parlent de nous')" />
  </template>
</template>
