
<script setup lang="ts">
const { localePath } = useLocalePath()
const { t } = useT()
interface SubcategoryPill {
  label: string
  url: string
  badge?: string
}

const props = defineProps<{
  h1: string
  introHtml?: string | null
  imagePath?: string | null
  imageAlt?: string | null
  label: string
  
  fallbackIntro?: string | null
  
  subcategories?: SubcategoryPill[]
  
  imageWebpSrcset?: string | null
  
  imageSizes?: string | null
  

  compactMode?: boolean
  

  imageSide?: 'left' | 'right'
  
  emptyImagePlaceholder?: boolean
  

  layout?: 'stacked' | 'split'
  
  titleTone?: 'primary' | 'ink'
}>()

const isSplit = computed(() => props.layout === 'split' && !props.compactMode)
const h1ToneClass = computed(() => (props.titleTone === 'ink'
  ? 'text-gray-900 dark:text-white'
  : 'text-primary-900 dark:text-primary-100'))

const imageOrderClass = computed(() => (props.imageSide === 'right' ? 'md:order-2' : ''))
const introOrderClass = computed(() => (props.imageSide === 'right' ? 'md:order-1' : ''))

const altText = computed(
  () => props.imageAlt || `${props.label}`,
)

const introExpanded = ref(false)
const introHasMore = computed(
  () => ((props.introHtml || '').match(/<p[\s>]/gi) || []).length > 1,
)

const imgLoadError = ref(false)
const fallbackError = ref(false)  
const heroImgRef = ref<HTMLImageElement | null>(null)
const hasImage = computed(() => !!props.imagePath && !imgLoadError.value)
const hasSplitImageColumn = computed(() => hasImage.value || props.emptyImagePlaceholder === true)

const defaultCoverUrl = '/img/c/_default.webp'

onMounted(() => {
  const img = heroImgRef.value
  if (img && img.complete && img.naturalWidth === 0) {
    imgLoadError.value = true
  }
})
</script>

<template>
  <header class="mb-1">
    
    <div v-if="isSplit" class="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
      <div :class="[hasSplitImageColumn ? 'md:col-span-7' : 'md:col-span-12', introOrderClass]">
        <h1 class="mb-4 text-2xl font-bold tracking-tight sm:text-3xl" :class="h1ToneClass">
          {{ h1 }}
        </h1>
        <template v-if="introHtml">
          <div
            class="max-w-none text-sm leading-relaxed text-gray-800
                   [&_p]:mb-3 [&_a]:underline [&_strong]:font-semibold
                   [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold
                   dark:text-slate-300"
            :class="introExpanded ? '' : '[&_p:nth-of-type(n+2)]:hidden'"
            v-html="introHtml"
          />
          <button
            v-if="introHasMore"
            type="button"
            class="text-xs font-medium underline"
            :aria-expanded="introExpanded"
            @click="introExpanded = !introExpanded"
          >
            {{ introExpanded ? t('silo.read_less') : t('silo.read_more') }}
          </button>
        </template>
        <p v-else-if="fallbackIntro" class="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          {{ fallbackIntro }}
        </p>
      </div>
      <div v-if="hasSplitImageColumn" :class="['md:col-span-5', imageOrderClass]">
        <figure class="relative aspect-[2/1] overflow-hidden rounded-xl bg-gray-200">
          <img
            v-if="hasImage"
            ref="heroImgRef"
            :src="imagePath!"
            :alt="altText"
            width="600"
            height="300"
            class="h-full w-full object-cover"
            loading="eager"
            fetchpriority="high"
            @error="imgLoadError = true"
          />
          <div v-else class="h-full w-full bg-gray-200" aria-hidden="true" />
        </figure>
      </div>
    </div>

    <h1 v-if="!isSplit" class="mb-1 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl" :class="h1ToneClass">
      {{ h1 }}
    </h1>

    
    <div v-if="!compactMode && !isSplit" class="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
      
      <div :class="['mx-auto w-full max-w-[160px] md:col-span-2 md:mx-0 md:max-w-none', imageOrderClass]">
        <figure class="relative aspect-[4/3] overflow-hidden rounded-xl bg-primary-50">
          <picture v-if="hasImage">
            
            <source
              v-if="imageWebpSrcset"
              type="image/webp"
              :srcset="imageWebpSrcset"
              :sizes="imageSizes || '(min-width: 1280px) 380px, (min-width: 1024px) 33vw, (min-width: 768px) 30vw, 100vw'"
            />
            <img
              ref="heroImgRef"
              :src="imagePath!"
              :alt="altText"
              width="400"
              height="400"
              class="h-full w-full object-cover"
              loading="eager"
              fetchpriority="high"
              @error="imgLoadError = true"
            />
          </picture>
          
          <img
            v-else-if="!fallbackError"
            :src="defaultCoverUrl"
            :alt="altText"
            width="400"
            height="400"
            class="h-full w-full object-cover"
            loading="eager"
            @error="fallbackError = true"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-primary-200">
            <svg class="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        </figure>
      </div>

      
      <div :class="['md:col-span-10', introOrderClass]">
        <template v-if="introHtml">
          
          <div
            class="prose prose-lg max-w-none
                   [&_p]:leading-relaxed [&_p]:text-slate-700
                   [&_a]:text-primary-600 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline
                   [&_strong]:text-slate-900 [&_strong]:font-semibold
                   dark:[&_p]:text-slate-300 dark:[&_strong]:text-white"
            :class="introExpanded ? 'inline [&_p]:block [&_p]:mb-6 [&_p:last-of-type]:inline [&_p:last-of-type]:mb-0' : 'inline [&_p]:inline [&_p:nth-of-type(n+2)]:hidden'"
            v-html="introHtml"
          />
          <button
            v-if="introHasMore"
            type="button"
            class="ml-1 inline text-xs italic font-medium text-primary-600 hover:underline"
            :aria-expanded="introExpanded"
            @click="introExpanded = !introExpanded"
          >
            {{ introExpanded ? t('silo.read_less') : t('silo.read_more') }}
          </button>
        </template>
        <p v-else-if="fallbackIntro" class="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {{ fallbackIntro }}
        </p>

        
        <div v-if="subcategories && subcategories.length > 0" class="mt-1">
          <div class="flex flex-wrap gap-2 pb-1">
            <NuxtLink
              v-for="sub in subcategories"
              :key="sub.url"
              :to="localePath(sub.url)"
              class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {{ sub.label }}
              <span
                v-if="sub.badge"
                class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-bold uppercase text-white"
              >
                {{ sub.badge }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    
    <div v-else-if="compactMode && subcategories && subcategories.length > 0" class="mt-2">
      <div class="flex flex-wrap gap-2 pb-1">
        <NuxtLink
          v-for="sub in subcategories"
          :key="sub.url"
          :to="localePath(sub.url)"
          class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800"
        >
          {{ sub.label }}
          <span
            v-if="sub.badge"
            class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-bold uppercase text-white"
          >
            {{ sub.badge }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
