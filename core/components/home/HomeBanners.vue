
<script setup lang="ts">
import { NuxtLink } from '#components'
import type { I18nString } from '~/composables/useI18nField'

interface BannerItem {
  image:      string
  header?:    I18nString
  title?:     I18nString
  footer?:    I18nString
  cta_label?: I18nString
  cta_href?:  string
  target?:    '_self' | '_blank'
  
  logo?:      string
  
  accent?:    I18nString
}

interface BannerPayload {
  items?:   BannerItem[]
  height?:  number
  cols?:    1 | 2 | 3 | 4
  variant?: string
}

const props = defineProps<{
  title?:    string | null
  subtitle?: string | null
  payload:   BannerPayload | null
  
  priority?: boolean
}>()

const { t: i18nt } = useI18nField()

const items  = computed<BannerItem[]>(() => props.payload?.items ?? [])
const height = computed(() => props.payload?.height ?? 512)
const cols   = computed(() => props.payload?.cols ?? 3)

const gridCols = computed(() => ({
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}[cols.value] ?? 'md:grid-cols-3'))

const isExternal = (href?: string) =>
  !!href && (href.startsWith('http://') || href.startsWith('https://'))

const { localePath } = useLocalePath()
const linkTo = (href?: string) =>
  href && !isExternal(href) ? localePath(href) : undefined

const isSplit = computed(() => props.payload?.variant === 'split')
const isArtwork = computed(() => props.payload?.variant === 'artwork')
const isFullBleedArtwork = computed(() => props.payload?.variant === 'full-bleed-artwork')

function titleParts(item: BannerItem) {
  const full   = i18nt(item.title) || ''
  const accent = i18nt(item.accent) || ''
  if (!accent) return null
  const at = full.indexOf(accent)
  if (at < 0) return null
  return { before: full.slice(0, at), accent, after: full.slice(at + accent.length) }
}
</script>

<template>
  <section
    v-if="items.length"
    class="bg-white dark:bg-slate-900"
    :class="isFullBleedArtwork ? 'banner-section--full-bleed' : 'py-10'"
  >
    <div :class="isFullBleedArtwork ? 'w-full' : 'max-w-6xl mx-auto px-4 sm:px-6'">
      <div v-if="title" class="mb-6 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-slate-400 mt-2">{{ subtitle }}</p>
      </div>

      <div :class="['grid grid-cols-1', isFullBleedArtwork ? 'gap-0' : 'gap-4', gridCols, isSplit ? 'md:gap-12' : '']">
        <component
          v-for="(item, i) in items"
          :is="item.cta_href ? (isExternal(item.cta_href) ? 'a' : NuxtLink) : 'div'"
          :key="i"
          :to="linkTo(item.cta_href)"
          :href="item.cta_href && isExternal(item.cta_href) ? item.cta_href : undefined"
          :target="item.cta_href && item.target === '_blank' ? '_blank' : undefined"
          :rel="item.cta_href && isExternal(item.cta_href) ? 'noopener noreferrer' : undefined"
          :title="i18nt(item.title)"
          class="banner-card group relative block overflow-hidden"
          :class="[
            isFullBleedArtwork ? 'banner-card--full-bleed' : 'rounded-xl',
            isSplit ? 'bg-[#f5f5f5] dark:bg-slate-800' : '',
            isArtwork ? 'banner-card--artwork border border-gray-200 bg-white shadow-md' : '',
          ]"
          :style="{ '--banner-h': `${height}px` }"
        >
          
          <template v-if="isArtwork || isFullBleedArtwork">
            <NuxtImg
              v-if="isIpxResolvable(item.image)"
              :src="item.image"
              :alt="i18nt(item.title) || i18nt(item.header) || ''"
              :class="isFullBleedArtwork
                ? 'artwork-image block h-auto w-full'
                : 'artwork-image absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]'"
              :sizes="isFullBleedArtwork ? '100vw' : '100vw md:50vw'"
              densities="x1 x2 x3"
              format="webp"
              :loading="priority && i === 0 ? 'eager' : 'lazy'"
            />
            <img
              v-else
              :src="item.image"
              :alt="i18nt(item.title) || i18nt(item.header) || ''"
              :class="isFullBleedArtwork
                ? 'artwork-image block h-auto w-full'
                : 'artwork-image absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]'"
              :loading="priority && i === 0 ? 'eager' : 'lazy'"
              decoding="async"
            />
            <img
              v-if="item.logo"
              :src="item.logo"
              alt=""
              aria-hidden="true"
              class="artwork-logo pointer-events-none absolute left-[3.2%] top-[3.5%] z-10 h-auto w-[22%]"
              loading="lazy"
              decoding="async"
            />
          </template>

          
          <div
            v-else-if="isSplit"
            class="grid h-full grid-cols-1 gap-6 p-6 sm:grid-cols-[42%_1fr] sm:gap-8 sm:p-8"
          >
            <div class="h-full min-h-32">
              <NuxtImg
                v-if="isIpxResolvable(item.image)"
                :src="item.image"
                :alt="i18nt(item.title) || i18nt(item.header) || ''"
                class="h-full w-full object-contain object-center mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105 dark:mix-blend-normal"
                sizes="100vw sm:22vw"
                densities="x1 x2 x3"
                format="webp"
                :loading="priority && i === 0 ? 'eager' : 'lazy'"
              />
              <img
                v-else
                :src="item.image"
                :alt="i18nt(item.title) || i18nt(item.header) || ''"
                class="h-full w-full object-contain object-center mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105 dark:mix-blend-normal"
                :loading="priority && i === 0 ? 'eager' : 'lazy'"
                decoding="async"
              />
            </div>
            <div class="flex flex-col items-start justify-center gap-3 text-left">
              <span
                v-if="i18nt(item.header)"
                class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400"
              >
                {{ i18nt(item.header) }}
              </span>
              <h3 class="text-2xl font-extrabold uppercase leading-[1.05] text-gray-900 sm:text-3xl lg:text-4xl dark:text-white">
                <template v-if="titleParts(item)">{{ titleParts(item)!.before
                  }}<span class="text-primary-600">{{ titleParts(item)!.accent }}</span>{{ titleParts(item)!.after }}</template>
                <template v-else>{{ i18nt(item.title) }}</template>
              </h3>
              <p v-if="i18nt(item.footer)" class="text-base text-gray-700 lg:text-lg dark:text-slate-300">
                {{ i18nt(item.footer) }}
              </p>
              
              <span
                v-if="i18nt(item.cta_label)"
                class="mt-1 inline-flex items-center rounded-lg bg-slate-900 px-7 py-3 text-base font-semibold text-white transition-colors group-hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:group-hover:bg-slate-200"
              >
                {{ i18nt(item.cta_label) }}
              </span>
            </div>
          </div>

          <template v-else>
            
            <NuxtImg
              v-if="isIpxResolvable(item.image)"
              :src="item.image"
              :alt="i18nt(item.title) || i18nt(item.header) || ''"
              class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="100vw md:50vw xl:33vw"
              densities="x1 x2 x3"
              format="webp"
              :loading="priority && i === 0 ? 'eager' : 'lazy'"
            />
            <img
              v-else
              :src="item.image"
              :alt="i18nt(item.title) || i18nt(item.header) || ''"
              class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              :loading="priority && i === 0 ? 'eager' : 'lazy'"
              decoding="async"
            />
            
            <div
              aria-hidden="true"
              class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"
            />
            <div class="relative z-10 flex h-full flex-col items-center justify-start text-center px-6 pt-8 pb-10 text-white">
              <span
                v-if="i18nt(item.header)"
                class="text-xs sm:text-sm font-semibold uppercase tracking-widest drop-shadow-md mb-2"
              >
                {{ i18nt(item.header) }}
              </span>
              <span
                v-if="i18nt(item.title)"
                class="text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md mb-2"
              >
                {{ i18nt(item.title) }}
              </span>
              <span
                v-if="i18nt(item.footer)"
                class="text-sm drop-shadow-md max-w-xs"
              >
                {{ i18nt(item.footer) }}
              </span>
            </div>
          </template>
        </component>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
  Mobile-first : ratio 4/3 — la bannière garde une forme "photo paysage" agréable
  sur écran étroit sans être ni trop haute ni trop basse.
  Desktop (md ≥ 768px) : hauteur fixe issue du payload (--banner-h, défaut 512px).
  L'aspect-ratio est neutralisé (auto) pour que height prenne le relais.
*/
.banner-card {
  aspect-ratio: 4/3;
}
.banner-section--full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
}
/*
  `100vw` inclut la gouttière de la barre verticale dans Chromium. Le bandeau
  dépasserait alors la zone réellement affichable de quelques pixels et ferait
  apparaître une barre horizontale sur toute la page. On coupe uniquement ce
  débordement de viewport lorsque la page contient ce rendu pleine largeur.
*/
:global(html:has(.banner-section--full-bleed)),
:global(body:has(.banner-section--full-bleed)) {
  overflow-x: clip;
}
.banner-card--full-bleed {
  height: auto;
  aspect-ratio: auto;
}
@media (min-width: 768px) {
  .banner-card {
    height: var(--banner-h, 512px);
    aspect-ratio: auto;
  }
  .banner-card--artwork {
    height: auto;
    aspect-ratio: 4/3;
  }
  .banner-card--full-bleed {
    height: auto;
    aspect-ratio: auto;
  }
}
</style>
