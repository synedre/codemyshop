
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()

const productId = Number.parseInt(String(route.params.id ?? ''), 10)

if (!productId || Number.isNaN(productId)) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable' })
}

const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const { activeLang } = useRouteLang()

const { isSportLayout } = useProductLayout()

const { data: urlLookup } = await useFetch<{ found: boolean; path?: string }>('/api/product-url-by-id', {
  query: { id: productId, lang: activeLang },
  key: `product-url-${productId}`,
  watch: [activeLang],
})

const canonical = urlLookup.value?.path
if (urlLookup.value?.found && canonical && canonical.lastIndexOf('/') > 0) {
  await navigateTo(canonical, { redirectCode: 301, external: false })
}

const { data: product, error } = await useFetch<any>(`/api/catalogue/product/${productId}`, {
  query: { clientId, lang: activeLang },
  key: `product-${productId}`,
  watch: [activeLang],
})

assertPageResource(product, error, 'Produit introuvable', 'product')
</script>

<template>
  <NuxtLayout name="white-label">
    <ProductDetailSport v-if="isSportLayout" :product="product" :client-id="clientId" />
    <ProductDetail v-else :product="product" :client-id="clientId" />
  </NuxtLayout>
</template>
