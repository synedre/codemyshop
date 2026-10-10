
<script setup lang="ts">
const { localePath } = useLocalePath()

interface Category {
  icon?:    string
  image?:   string | null
  label:    string | Record<string, string>
  
  tagline?: string | Record<string, string> | null
  href:     string
}

const props = withDefaults(
  defineProps<{
    categories: Category[]
    title?: string | null
    subtitle?: string | null
    

    variant?: string | null
  }>(),
  { title: '', subtitle: '', variant: null },
)

const isCover = computed(() => props.variant === 'tiles-cover')
const isTiles = computed(() => props.variant === 'tiles' || isCover.value)
const isMosaic = computed(() => props.variant === 'mosaic' && props.categories.length === 7)
const tileImageSizes = computed(() => isCover.value
  ? 'xs:50vw sm:33vw lg:33vw'
  : 'xs:50vw sm:33vw lg:307px')

const mosaicPositions = [
  'lg:col-start-1 lg:col-end-4 lg:row-start-1 lg:row-end-2',
  'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-4',
  'lg:col-start-7 lg:col-end-8 lg:row-start-1 lg:row-end-2',
  'lg:col-start-1 lg:col-end-4 lg:row-start-3 lg:row-end-4',
  'lg:col-start-7 lg:col-end-8 lg:row-start-3 lg:row-end-6',
  'lg:col-start-1 lg:col-end-2 lg:row-start-5 lg:row-end-6',
  'col-span-2 lg:col-start-3 lg:col-end-6 lg:row-start-5 lg:row-end-6',
] as const
const mosaicLabelPositions = [
  'left-3 top-3 lg:left-8 lg:top-[18px]',
  'right-3 top-3 lg:right-8 lg:top-[18px]',
  'left-3 bottom-3 lg:left-8 lg:bottom-[18px]',
  'right-3 bottom-3 lg:right-8 lg:bottom-[18px]',
  'left-1/2 bottom-3 -translate-x-1/2 lg:bottom-[18px]',
  'left-3 top-3 lg:left-8 lg:top-[18px]',
  'right-3 top-3 lg:right-8 lg:top-[18px]',
] as const

const { t: i18nt } = useI18nField()
const { t } = useHubT()
const contentWidthClass = useContentWidth()

const hasAnyImage = computed(() => props.categories.some((c) => !!c.image))

const resolvedTitle = computed(() =>
  props.title
    ? (typeof props.title === 'string' ? props.title : i18nt(props.title as any))
    : t('home.home_categories', 'Nos univers'),
)
</script>

<template>
  <section v-if="isMosaic" class="bg-white py-8 lg:py-12">
    <div class="mx-auto w-full px-6 lg:max-w-[1648px]">
      <div class="grid grid-cols-2 auto-rows-[150px] gap-2 rounded-2xl bg-[#F2F2F2] p-3 sm:auto-rows-[190px] lg:h-[664px] lg:grid-cols-[376fr_18fr_197fr_17fr_523fr_16fr_370fr] lg:grid-rows-[191fr_13fr_191fr_13fr_192fr] lg:auto-rows-auto lg:gap-0 lg:px-[42px] lg:py-8">
        <NuxtLink
          v-for="(cat, index) in categories"
          :key="cat.href"
          :to="localePath(cat.href)"
          :class="mosaicPositions[index]"
          class="group relative block overflow-hidden rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <img
            v-if="cat.image"
            :src="cat.image"
            alt=""
            :class="index === 4 ? 'object-contain' : 'object-cover'"
            class="h-full w-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          >
          <div v-else class="flex h-full w-full items-center justify-center text-primary-600">
            <HomeUniverseIcon v-if="cat.icon" :name="cat.icon as any" class="h-3/4 w-3/4" />
          </div>
          <span :class="mosaicLabelPositions[index]" class="absolute rounded bg-white/90 px-2 py-1 text-sm font-bold text-black lg:rounded-none lg:bg-transparent lg:p-0 lg:text-[32px] lg:leading-none">
            {{ i18nt(cat.label) }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>

  
  <section v-if="!isMosaic && isTiles && categories?.length" class="bg-white py-16">
    
    <div class="mx-auto w-full px-6" :class="contentWidthClass">
      <div :class="isCover ? 'mb-8' : 'mb-12 text-center'">
        <h2 class="text-[40px] font-bold uppercase leading-none tracking-tight text-black lg:text-[56px]">
          {{ resolvedTitle }}
        </h2>
        <p v-if="isCover && subtitle" class="mt-3 text-sm uppercase tracking-wide text-gray-500">
          {{ subtitle }}
        </p>
      </div>

      <div :class="['flex flex-wrap gap-6 lg:gap-[50px]', isCover ? 'justify-start' : 'justify-center']">
        <NuxtLink
          v-for="cat in categories"
          :key="cat.href"
          :to="localePath(cat.href)"
          :class="[
            'group relative block w-[calc(50%-0.75rem)] overflow-hidden rounded-xl sm:w-[calc(33.333%-1rem)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            // Tuiles PRODUIT : largeur fixe, les rangées se centrent (7 rayons
            // → 4 puis 3). Tuiles de LIEU : un tiers de la largeur, donc trois
            // par rangée quelle que soit la taille de l'écran — une activité
            // n'est pas une vignette de catalogue, sa photo a besoin de place.
            isCover ? 'lg:w-[calc(33.333%-2.084rem)] bg-gray-200' : 'lg:w-[307px] bg-[#F6F6F6]',
          ]"
        >
          <div class="aspect-square w-full">
            
            <NuxtImg
              v-if="cat.image && isIpxResolvable(cat.image)"
              :src="cat.image"
              :alt="i18nt(cat.label)"
              :sizes="tileImageSizes"
              densities="x1 x2"
              format="webp"
              quality="72"
              :class="[
                'h-full w-full transition-transform duration-500 group-hover:scale-105',
                isCover ? 'object-cover' : 'object-contain p-6 mix-blend-multiply',
              ]"
              loading="lazy"
              decoding="async"
            />
            <img
              v-else-if="cat.image"
              :src="cat.image"
              :alt="i18nt(cat.label)"
              :class="[
                'h-full w-full transition-transform duration-500 group-hover:scale-105',
                isCover ? 'object-cover' : 'object-contain p-6 mix-blend-multiply',
              ]"
              loading="lazy"
              decoding="async"
            >
            <div v-else class="flex h-full w-full items-center justify-center p-8 text-primary-600">
              <HomeUniverseIcon v-if="cat.icon" :name="cat.icon as any" class="h-full w-full" />
            </div>
          </div>
          
          <span
            :class="[
              'absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1.5rem)] whitespace-normal text-center rounded-md px-4 py-2 text-[14px] font-bold uppercase leading-tight tracking-wide',
              isCover ? 'bg-white text-black' : 'bg-black text-white',
            ]"
          >{{ i18nt(cat.label) }}</span>
        </NuxtLink>
      </div>
    </div>
  </section>

  <section v-else-if="!isMosaic && categories?.length" class="py-12 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-8">{{ resolvedTitle }}</h2>

      
      <div
        :class="[
          'grid gap-4 sm:gap-5',
          hasAnyImage
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
        ]"
      >
        <NuxtLink
          v-for="cat in categories"
          :key="cat.href"
          :to="localePath(cat.href)"
          class="group relative overflow-hidden rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          :class="cat.image ? 'block' : 'flex flex-col items-center gap-4 p-5 bg-gray-50 hover:bg-primary-600/5 hover:shadow-md'"
        >

          
          <template v-if="cat.image">
            
            <div class="relative w-full aspect-[4/3] sm:aspect-square overflow-hidden">
              
              <NuxtImg
                v-if="isIpxResolvable(cat.image)"
                :src="cat.image"
                :alt="i18nt(cat.label)"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="xs:100vw sm:50vw md:33vw"
                densities="x1 x2 x3"
                format="webp"
                quality="72"
                loading="lazy"
                decoding="async"
              />
              <img
                v-else
                :src="cat.image"
                :alt="i18nt(cat.label)"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                aria-hidden="true"
              />
              
              <div class="absolute bottom-0 left-0 right-0 p-4">
                <p class="text-white font-bold text-base leading-tight drop-shadow-sm">
                  {{ i18nt(cat.label) }}
                </p>
                <p
                  v-if="i18nt(cat.tagline)"
                  class="text-white/80 text-xs mt-1 leading-snug line-clamp-2 drop-shadow-sm"
                >
                  {{ i18nt(cat.tagline) }}
                </p>
              </div>
            </div>
          </template>

          
          <template v-else>
            <div class="w-32 h-32 sm:w-36 sm:h-36 md:w-full md:aspect-square md:h-auto flex items-center justify-center text-primary-600 group-hover:scale-105 transition-transform duration-300">
              <HomeUniverseIcon
                v-if="cat.icon"
                :name="cat.icon as any"
                class="w-full h-full"
              />
              
            </div>
            <span class="text-base font-semibold text-gray-700 group-hover:text-primary-600 text-center leading-tight">
              {{ i18nt(cat.label) }}
            </span>
          </template>

        </NuxtLink>
      </div>
    </div>
  </section>
</template>
