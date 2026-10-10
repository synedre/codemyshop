
<script setup lang="ts">
const { localePath } = useLocalePath()
interface ArticleCard {
  id: number
  title: string
  slug: string
  excerpt: string
  url: string
  date_published: string | null
}

interface ArticlesResponse {
  articles: ArticleCard[]
  total: number
  limit: number
}

const props = withDefaults(
  defineProps<{
    endpoint: string
    query: Record<string, string | number>
    keyPrefix: string
    title?: string
    
    layout?: 'carousel' | 'grid'
    
    seeAllHref?: string | null
    
    seeAllLabel?: string | null
  }>(),
  { title: 'Articles liés', layout: 'carousel', seeAllHref: null, seeAllLabel: null },
)

const { activeLang } = useRouteLang()
const fetchQuery = computed(() => ({ ...props.query, lang: activeLang.value }))
const { data } = await useFetch<ArticlesResponse>(props.endpoint, {
  query: fetchQuery,
  key: () => `${props.keyPrefix}-${activeLang.value}`,
  watch: [fetchQuery],
})

const articles = computed(() => data.value?.articles ?? [])

const isGrid = computed(() => props.layout === 'grid')

const articlesAffiches = computed(() =>
  isGrid.value ? articles.value.slice(0, 3) : articles.value,
)
const seeAllVisible = computed(() => isGrid.value && !!props.seeAllHref && !!props.seeAllLabel)
</script>

<template>
  <div v-if="articles.length > 0">
    <h2
      v-if="!isGrid"
      class="mb-6 text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100"
    >
      {{ title }}
    </h2>
    <div v-else class="mb-5 flex items-baseline justify-between gap-4">
      <h2 class="text-base font-bold uppercase tracking-tight text-slate-950 dark:text-slate-100">
        {{ title }}
      </h2>
      
      <NuxtLink
        v-if="seeAllVisible"
        :to="localePath(seeAllHref!)"
        class="shrink-0 text-xs text-slate-700 underline underline-offset-2 transition-colors hover:text-primary-700 dark:text-slate-400"
      >{{ seeAllLabel }}</NuxtLink>
    </div>

    <div
      :class="isGrid
        ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
        : '-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0'"
      style="scrollbar-width: thin;"
    >
      <NuxtLink
        v-for="article in articlesAffiches"
        :key="article.id"
        :to="localePath(article.url)"
        :class="isGrid
          ? 'group flex flex-col'
          : 'group flex w-72 flex-shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-primary-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900'"
      >
        <div :class="isGrid ? 'aspect-[3/2] bg-slate-200 dark:bg-slate-800' : 'aspect-[16/9] overflow-hidden bg-slate-50 dark:bg-slate-800'">
          <div v-if="!isGrid" class="flex h-full w-full items-center justify-center text-slate-300">
            <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
        </div>

        <div :class="isGrid ? 'flex flex-1 flex-col pt-3' : 'flex flex-1 flex-col p-4'">
          <h3 :class="isGrid
            ? 'mb-2 line-clamp-2 text-sm font-normal text-slate-500 transition-colors group-hover:text-primary-700 dark:text-slate-400 dark:group-hover:text-primary-400'
            : 'mb-2 line-clamp-2 text-base font-semibold text-slate-900 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400'">
            {{ article.title }}
          </h3>
          <p
            v-if="article.excerpt"
            :class="isGrid
              ? 'line-clamp-3 flex-1 text-xs leading-4 text-slate-950 dark:text-slate-200'
              : 'line-clamp-3 flex-1 text-sm text-slate-600 dark:text-slate-400'"
          >
            {{ article.excerpt }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
