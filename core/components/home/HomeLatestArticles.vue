
<script setup lang="ts">
import { blogHrefFromApi } from '~/utils/blog-url'

import { useDisplayTimeZone } from '../../composables/useDisplayTimeZone'

const displayTz = useDisplayTimeZone()

const { localePath } = useLocalePath()
const { t: i18nt } = useI18nField()
const { t } = useHubT()
const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload?: { limit?: number; cta_label?: string; cta_to?: string } | null
}>()

const limit = computed(() => Math.min(Math.max(props.payload?.limit ?? 3, 1), 12))
const { activeLang } = useRouteLang()

const blogDefaultLocale = String((useRuntimeConfig().public as any).i18nDefaultLocale || 'fr')

const urlArticle = (nuxtUrl: string) => blogHrefFromApi(nuxtUrl, activeLang.value, blogDefaultLocale)

const { data } = await useFetch<any[]>('/api/cms', {
  key: `home-latest-articles-${limit.value}`,
  query: { limit: limit.value, lang: activeLang },
  watch: [activeLang],
})
const articles = computed(() => data.value ?? [])

const failedCovers = ref<Set<number>>(new Set())
function onCoverError(id: number): void {
  failedCovers.value = new Set(failedCovers.value).add(id)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { timeZone: displayTz, day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateStr }
}
</script>

<template>
  <section v-if="articles.length" class="py-12 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900">{{ title || 'Notre blog : astuces & bons plans' }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="article in articles"
          :key="article.id"
          :to="urlArticle(article.nuxtUrl || `/blog/${article.linkRewrite}`)"
          class="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
        >
          <div class="aspect-[600/315] bg-gray-100 overflow-hidden">
            
            <img
              v-if="(article.thumbnailImage || article.coverImage) && !failedCovers.has(article.id)"
              :src="article.thumbnailImage || article.coverImage"
              :alt="article.title"
              width="600"
              height="315"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              @error="onCoverError(article.id)"
            />
            
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
              <span class="text-xs font-semibold text-primary-600 text-center leading-snug line-clamp-3">{{ article.title }}</span>
            </div>
          </div>

          <div class="p-5">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-700 transition-colors">
              {{ article.title }}
            </h3>
            <p v-if="article.datePublished" class="text-xs text-gray-500 mb-3">
              {{ t('home.blog_published', 'Publié :') }} {{ formatDate(article.datePublished) }}
            </p>
            <span class="inline-block text-xs font-semibold text-primary-700 group-hover:text-primary-800">
              {{ t('home.blog_read_article', "Lire l'article →") }}
            </span>
          </div>
        </NuxtLink>
      </div>

      <div v-if="payload?.cta_to" class="text-center mt-8">
        <NuxtLink
          :to="localePath(payload.cta_to)"
          class="inline-block px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
        >
          {{ i18nt(payload.cta_label) || 'Découvrez tous nos conseils' }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
