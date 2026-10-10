
<template>
  <section class="relative py-20 lg:py-24 bg-white dark:bg-slate-900">
    <div class="relative max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-slate-100">{{ (blogConfig?.title ? i18nt(blogConfig.title as any) : null) ?? t('home.home_blog', 'Derniers articles') }}</h2>
        <NuxtLink :to="localePath(BLOG_INDEX_PATH)" class="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">{{ t('home.blog_see_all', 'Voir tout →') }}</NuxtLink>
      </div>

      
      <div v-if="status === 'pending' && !articles?.length" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
          <div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
          <div class="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-full mb-2" />
          <div class="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-5/6" />
        </div>
      </div>

      <div v-else-if="articles?.length" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink
          v-for="article in articles"
          :key="article.id"
          :to="urlArticle(article.nuxtUrl)"
          class="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-md hover:border-primary-200 dark:hover:border-primary-600/40 transition-all duration-200"
        >
          
          <div class="aspect-[600/315] overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            <img
              v-if="(article.coverImage || article.thumbnailImage) && !failedCovers.has(article.id)"
              :src="article.coverImage || article.thumbnailImage"
              :alt="article.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy" width="600" height="315"
              @error="onCoverError(article.id)"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-slate-800 dark:to-slate-700 px-6"
            >
              <span class="text-sm font-semibold text-primary-600 dark:text-primary-400 text-center leading-snug line-clamp-3">{{ article.title }}</span>
            </div>
          </div>
          <div class="p-6 flex flex-col flex-1">
            <span class="inline-block text-xs font-semibold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-600/15 rounded-full px-3 py-1 mb-4 w-fit">Blog</span>
            <h3 class="text-base font-bold text-gray-800 dark:text-slate-100 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-snug">{{ article.title }}</h3>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed flex-1">{{ article.excerpt }}</p>
            <time v-if="article.datePublished" :datetime="article.datePublished" class="block mt-3 text-xs text-gray-500 dark:text-slate-400">{{ formatDate(article.datePublished) }}</time>
            <span class="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:underline">{{ t('home.blog_read_article', "Lire l'article →") }}</span>
          </div>
        </NuxtLink>
      </div>

      <div v-else class="text-center py-12"><p class="text-gray-500 dark:text-slate-400 text-sm mb-2">{{ t('blog.coming_soon', 'Les premiers articles arrivent bientôt.') }}</p><p class="text-xs text-gray-500 dark:text-slate-400">{{ t('blog.coming_soon_hint', 'PrestaShop Headless, SEO technique, IA e-commerce, architecture Docker — des guides actionables pour scaler votre boutique.') }}</p></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { blogHrefFromApi } from '~/utils/blog-url'
import { BLOG_INDEX_PATH } from '~/utils/category-canonical'
import type { HomepageBlog } from '~/types/theme'

import { useDisplayTimeZone } from '../../composables/useDisplayTimeZone'

const displayTz = useDisplayTimeZone()

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { timeZone: displayTz, day: 'numeric', month: 'short', year: 'numeric' })
}

const props = defineProps<{ blogConfig: HomepageBlog }>()
const { localePath } = useLocalePath()
const { t: i18nt } = useI18nField()
const { t } = useT()

const failedCovers = ref<Set<number>>(new Set())
function onCoverError(id: number): void {
  failedCovers.value = new Set(failedCovers.value).add(id)
}

const { activeLang } = useRouteLang()

const blogDefaultLocale = String((useRuntimeConfig().public as any).i18nDefaultLocale || 'fr')

const urlArticle = (nuxtUrl: string) => blogHrefFromApi(nuxtUrl, activeLang.value, blogDefaultLocale)

const { data: articles, status } = await useFetch('/api/cms', {
  key: `home-blog-${props.blogConfig.limit ?? 3}`,
  query: { limit: props.blogConfig.limit ?? 3, lang: activeLang },
  watch: [activeLang],
})
</script>
