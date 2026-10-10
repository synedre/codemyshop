
<script setup lang="ts">
const { localePath } = useLocalePath()
const { t } = useT()
import type { I18nString } from '~/composables/useI18nField'
import {
  heroCarrierClass,
  heroFrameClass,
  heroImageClass,
  heroImageStyle,
  heroPaginationClass,
  heroSideBlockImageClass,
  heroSlideClass,
  resolveHeroVariant,
} from '~/utils/hero-variant'
import { responsiveImagePreloadLink } from '~/utils/image-preload'

interface Slide {
  image: string
  
  width?: number
  height?: number
  sticker?: I18nString
  title?: I18nString
  subtitle?: I18nString
  cta_label?: I18nString
  cta_to?: string
}

interface SideBlock {
  image: string
  alt?: string
  to?: string
  sticker?: I18nString
  title?: I18nString
  cta_label?: I18nString
}

const props = defineProps<{
  

  payload: { slides?: Slide[]; side_blocks?: SideBlock[]; interval_ms?: number; variant?: string | null } | null
}>()

const { t: i18nt } = useI18nField()

const hasText = (v: I18nString) => !!i18nt(v).trim()

const NuxtLinkC = resolveComponent('NuxtLink')

const variantFlags = computed(() => resolveHeroVariant(props.payload?.variant))
const isFull = computed(() => variantFlags.value.isFull)
const isCampaign = computed(() => variantFlags.value.isCampaign)

const isStacked = computed(() => variantFlags.value.isStacked)

const isWide = computed(() => variantFlags.value.isWide)

const isSuperposed = computed(() => variantFlags.value.isStacked || variantFlags.value.isCampaign)
const slides = computed<Slide[]>(() => props.payload?.slides ?? [])

const HERO_SIZES = 'xs:100vw mobile:100vw phone:100vw md:66vw'
const HERO_DENSITIES = 'x1 x2 x3'

const SIDE_SIZES = 'xs:50vw mobile:50vw phone:50vw lg:33vw'
const SIDE_QUALITY = 72
if (import.meta.server && slides.value[0]?.image) {
  const $img = useImage()
  const lcp = $img.getSizes(slides.value[0].image, {
    preset: 'hero',
    sizes: HERO_SIZES,
    densities: HERO_DENSITIES,
    modifiers: { quality: $img.options.quality },
  })
  const link = responsiveImagePreloadLink(lcp)
  if (link) useHead({ link: [link] })
}
const sideBlocks = computed<SideBlock[]>(() => (props.payload?.side_blocks ?? []).slice(0, 2))
const interval = computed(() => Math.max(2000, props.payload?.interval_ms ?? 5000))

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function go(n: number) {
  if (slides.value.length === 0) return
  current.value = (n + slides.value.length) % slides.value.length
}

onMounted(() => {
  if (slides.value.length > 1) {
    timer = setInterval(() => go(current.value + 1), interval.value)
  }
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <section v-if="slides.length" :class="isWide ? 'bg-white' : 'bg-white py-6'">
    <div :class="isWide ? 'w-full' : 'max-w-6xl mx-auto px-4 sm:px-6'">
      
      <div class="grid grid-cols-1 gap-4" :class="sideBlocks.length ? 'lg:grid-cols-3' : ''">

        
        <div
          class="relative overflow-hidden"
          :class="[
            heroFrameClass(variantFlags),
            // `stacked` : le fond sombre servirait de bande sous l'image sur
            // mobile, là où le texte est posé sur fond clair. On garde le fond
            // sombre au-delà de md, où le texte repasse sur l'image.
            isStacked ? 'bg-secondary-50 md:bg-gray-900' : 'bg-gray-900',
            sideBlocks.length ? 'lg:col-span-2' : '',
          ]"
        >
          
          
          
          <div :class="heroCarrierClass(variantFlags)">
          <transition-group name="fade">
            
            <component
              :is="slide.cta_to && !hasText(slide.cta_label) ? NuxtLinkC : 'div'"
              v-for="(slide, i) in slides"
              v-show="isSuperposed || i === current"
              :key="i"
              :to="slide.cta_to && !hasText(slide.cta_label) ? localePath(slide.cta_to) : undefined"
              :class="heroSlideClass(variantFlags, i === current)"
              :aria-hidden="isSuperposed && i !== current ? 'true' : undefined"
            >
              
              
              <NuxtImg
                :src="slide.image"
                :alt="i18nt(slide.title) || ''"
                :class="heroImageClass(variantFlags)"
                :style="heroImageStyle(variantFlags, slide.width, slide.height)"
                :sizes="HERO_SIZES"
                :densities="HERO_DENSITIES"
                preset="hero"
                :loading="i === 0 ? 'eager' : 'lazy'"
                :fetchpriority="i === 0 ? 'high' : 'low'"
              />
              
              <div
                v-if="hasText(slide.sticker) || hasText(slide.title) || hasText(slide.subtitle) || hasText(slide.cta_label)"
                class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10 md:from-black/60 md:via-black/30 md:to-transparent"
                :class="isStacked ? 'hidden md:block' : ''"
              />
              
              <div
                v-if="hasText(slide.sticker) || hasText(slide.title) || hasText(slide.subtitle) || hasText(slide.cta_label)"
                class="z-10 px-4 sm:px-10"
                :class="isCampaign
                  ? 'absolute inset-0 flex flex-col justify-between py-6 sm:py-10'
                  : (isStacked
                    ? 'relative py-5 md:py-0 md:h-full md:flex md:items-center'
                    : 'relative h-full flex items-center')"
              >
                <div class="max-w-md space-y-2 sm:space-y-3">
                  
                  <span
                    v-if="hasText(slide.sticker)"
                    class="inline-block text-white font-bold uppercase"
                    :class="isCampaign
                      ? 'text-[10px] sm:text-xs tracking-widest'
                      : 'bg-red-600 text-[10px] sm:text-xs tracking-wider px-2 py-0.5 sm:px-3 sm:py-1 rounded'"
                  >
                    {{ i18nt(slide.sticker) }}
                  </span>
                  
                  <h2
                    v-if="hasText(slide.title)"
                    class="text-xl sm:text-3xl lg:text-4xl font-bold leading-tight"
                    :class="isStacked ? 'text-gray-900 md:text-white' : 'text-white'"
                  >
                    {{ i18nt(slide.title) }}
                  </h2>
                  <p
                    v-if="hasText(slide.subtitle)"
                    class="text-sm sm:text-lg font-semibold"
                    :class="isStacked ? 'text-primary-700 md:text-red-300' : 'text-red-300'"
                  >
                    {{ i18nt(slide.subtitle) }}
                  </p>
                  <NuxtLink
                    v-if="!isCampaign && slide.cta_to && hasText(slide.cta_label)"
                    :to="localePath(slide.cta_to)"
                    class="inline-block px-3 py-1.5 sm:px-5 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors"
                  >
                    {{ i18nt(slide.cta_label) }}
                  </NuxtLink>
                </div>
                
                <div v-if="isCampaign && slide.cta_to && hasText(slide.cta_label)" class="flex justify-end">
                  <NuxtLink
                    :to="localePath(slide.cta_to)"
                    class="inline-block px-3 py-1.5 sm:px-5 sm:py-2.5 bg-white hover:bg-gray-100 text-gray-900 text-sm sm:text-base font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    {{ i18nt(slide.cta_label) }}
                  </NuxtLink>
                </div>
              </div>
            </component>
          </transition-group>
          </div>

          
          <div v-if="slides.length > 1" :class="heroPaginationClass(variantFlags)">
            
            <button
              v-for="(_, i) in slides"
              :key="i"
              @click="go(i)"
              :aria-label="t('home.aria_goto_slide', 'Aller au slide {n}', { n: i + 1 })"
              class="group flex h-6 items-center justify-center px-[7px]"
            >
              <span
                class="block h-2.5 rounded-full transition-all"
                :class="[
                  i === current ? 'w-8' : 'w-2.5',
                  // Le survol suit la CIBLE (`group-hover`), pas le point : sinon
                  // survoler le rembourrage qu'on vient d'ajouter ne ferait rien,
                  // et la puce paraîtrait morte sur ses deux tiers.
                  // `stacked` : sur mobile les puces tombent sur le fond clair du
                  // bloc texte — en blanc elles y seraient invisibles.
                  isStacked
                    ? (i === current
                      ? 'bg-gray-900 md:bg-white'
                      : 'bg-gray-400 group-hover:bg-gray-500 md:bg-white/60 md:group-hover:bg-white/80')
                    : (i === current ? 'bg-white' : 'bg-white/60 group-hover:bg-white/80'),
                ]"
              />
            </button>
          </div>
        </div>

        
        <div v-if="sideBlocks.length" class="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:h-[440px]">
          <component
            :is="block.to ? NuxtLinkC : 'div'"
            v-for="(block, i) in sideBlocks"
            :key="i"
            :to="block.to || undefined"
            class="relative overflow-hidden rounded-xl bg-gray-100 aspect-[16/9] lg:aspect-auto lg:h-full group"
          >
            <NuxtImg
              :src="block.image"
              :alt="block.alt || ''"
              :class="heroSideBlockImageClass(variantFlags)"
              :sizes="SIDE_SIZES"
              densities="x1 x2 x3"
              preset="hero"
              :quality="SIDE_QUALITY"
              loading="lazy"
            />
            
            <div v-if="hasText(block.sticker) || hasText(block.title) || hasText(block.cta_label)" class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent md:from-black/50 md:via-transparent" />
            <div v-if="hasText(block.sticker) || hasText(block.title) || hasText(block.cta_label)" class="absolute bottom-0 left-0 right-0 p-2 sm:p-4 z-10 space-y-1 sm:space-y-1.5">
              <span v-if="hasText(block.sticker)" class="inline-block bg-red-600 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded">
                {{ i18nt(block.sticker) }}
              </span>
              <p v-if="hasText(block.title)" class="text-[11px] sm:text-xl font-bold text-white leading-tight">
                {{ i18nt(block.title) }}
              </p>
              
              <span
                v-if="block.to && hasText(block.cta_label)"
                class="hidden sm:inline-block text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded transition-colors"
              >
                {{ i18nt(block.cta_label) }}
              </span>
            </div>
          </component>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.8s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
