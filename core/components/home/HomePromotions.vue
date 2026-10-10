
<script setup lang="ts">
const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload?: {
    
    product_ids?: number[]
    limit?: number
    featuredPosition?: 'left' | 'right'
    id_category?: number
    
    variant?: string
    sectionBadge?: string | null
    note?: string | null
    titleAccent?: string | null
  } | null
}>()

const variant = computed(() => props.payload?.variant || 'featured')
const isShowcase = computed(() => variant.value.startsWith('showcase'))

const limit = computed(() => {
  const max = isShowcase.value ? 12 : 5
  return Math.min(Math.max(props.payload?.limit ?? max, 1), max)
})
const featuredPosition = computed<'left' | 'right'>(() =>
  props.payload?.featuredPosition === 'left' ? 'left' : 'right',
)

const cfg = useRuntimeConfig()
const idCategory = computed(() => Number(
  props.payload?.id_category
    ?? (cfg.public as any).promotionsCategoryId
    ?? 391,
))

const pinnedIds = computed(() => (props.payload?.product_ids ?? [])
  .map(Number)
  .filter((n) => Number.isInteger(n) && n > 0)
  .slice(0, limit.value))
const hasPinned = computed(() => pinnedIds.value.length > 0)

const { activeLang } = useRouteLang()

const { data } = await useFetch(
  () => (hasPinned.value ? '/api/catalogue/by-ids' : '/api/catalogue/by-category'),
  {
    key: `home-promotions-${idCategory.value}-${limit.value}-${pinnedIds.value.join('-')}`,
    query: computed(() => (hasPinned.value
      ? { ids: pinnedIds.value.join(','), lang: activeLang.value }
      : { id_category: idCategory.value, limit: limit.value, lang: activeLang.value })),
    watch: [activeLang],
  },
)
const products = computed(() => data.value?.products ?? [])
const { t } = useHubT()
</script>

<template>
  <HomeProductShowcaseGrid
    v-if="isShowcase"
    :title="title || t('home.home_promotions', 'Nos promotions')"
    :subtitle="subtitle"
    :products="products"
    :card-variant="variant === 'showcase-offer' ? 'showcase-offer' : 'showcase'"
    :section-badge="payload?.sectionBadge"
    :note="payload?.note"
    :title-accent="payload?.titleAccent"
  />
  <HomeFeaturedProductGrid
    v-else
    :title="title || t('home.home_promotions', 'Nos promotions')"
    :subtitle="subtitle"
    :products="products"
    :header-pill="{ text: t('home.promo_pill', 'Offres en cours'), variant: 'red' }"
    :featured-position="featuredPosition"
  />
</template>
