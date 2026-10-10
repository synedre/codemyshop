
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { t } = useHubT()

const searchQuery = computed(() => (route.query.q as string) || '')

const _cfg = useRuntimeConfig()
const _clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')
const { resolvedClientId } = useClientDetection()

const { currentContext: menuContext } = useMegamenu()
const searchContext = computed(() => {
  const fromUrl = (route.query.context as string) || ''
  return fromUrl || menuContext.value || 'default'
})

const { activeLang } = useRouteLang()
const { data: results, pending } = await useFetch('/api/catalogue/search', {
  query: computed(() => {
    const params: Record<string, string | number> = {
      clientId: _clientId,
      q: searchQuery.value,
      limit: 50,
      lang: activeLang.value,
    }
    
    
    if (searchContext.value && searchContext.value !== 'default') {
      params.context = searchContext.value
    }
    return params
  }),
  watch: [searchQuery, activeLang, searchContext],
})

const products = computed(() => {
  const raw = results.value
  return Array.isArray(raw) ? raw : (raw as any)?.products ?? []
})

useHead({
  title: computed(() => {
    const suffix = _brand ? ` — ${_brand}` : ''
    const base = t('search.head_title', 'Recherche')
    if (!searchQuery.value) return `${base}${suffix}`
    
    
    
    return `${t('search.head_title_query', 'Recherche : {query}').replace('{query}', searchQuery.value)}${suffix}`
  }),
})
useListingBodyId('search')
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        
        <h1 class="text-2xl font-semibold text-gray-900 mb-6">
          {{ searchQuery
            ? t('search.head_title_query', 'Recherche : {query}').replace('{query}', searchQuery)
            : t('search.head_title', 'Recherche') }}
        </h1>

        
        <div class="sm:hidden max-w-2xl mx-auto mb-10">
          <SearchAutocomplete :client-id="resolvedClientId" variant="mobile" />
        </div>

        
        <div v-if="pending" class="text-center py-10">
          <p class="text-gray-400 text-sm">{{ t('catalogue.search_loading') }}</p>
        </div>

        <div v-else-if="products.length">
          
          <h2 class="text-sm text-gray-500 mb-6">{{ t('catalogue.catalogue_search_results_count', '{count} résultat(s) pour « {q} »').replace('{count}', String(products.length)).replace('{q}', String(route.query.q || '')) }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
              :show-wishlist="false"
            />
          </div>
        </div>

        <div v-else-if="route.query.q" class="text-center py-20">
          <p class="text-gray-400 text-sm">{{ t('catalogue.catalogue_search_no_results_for', 'Aucun résultat pour « {q} »').replace('{q}', String(route.query.q || '')) }}</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
