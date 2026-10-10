
<script setup lang="ts">
interface ProductCardData {
  id: number
  ref?: string | null
  name: string
  

  url?: string
  image?: string | null
  
  imageSrcset?: string | null
  
  imageThumbnails?: string[]
  
  imageFallback?: string | null
  
  imageLarge?: string | null
  
  descriptionShort?: string | null
  
  price: string
  
  priceRaw?: number
  
  pricePromo?: string
  pricePromoRaw?: number
  
  reductionLabel?: string
  
  format?: string
  packaging?: string
  caliber?: string
  

  attributes?: string[]
  

  pricePerKgFormatted?: string
  

  pricePerKgPromoFormatted?: string
  

  savingsFormatted?: string
  

  taxRate?: number
  

  unitLabel?: string
  

  stockQuantity?: number
  

  badges?: Array<{ text: string; variant: 'promo' | 'new' | 'custom' }>
  

  aliases?: string[]
  

  rating?: number
  
  reviewCount?: number
  

  brandLogo?: string | null
}

type BadgeVariant = 'promo' | 'top' | 'new' | 'custom' | 'warning'

type CardLayout = 'default' | 'detailed'

type CardPresentation = 'full' | 'minimal' | 'flat'

const props = withDefaults(
  defineProps<{
    product: ProductCardData
    featured?: boolean
    showWishlist?: boolean
    

    layout?: CardLayout
    
    presentation?: CardPresentation
    
    badge?: { text: string; variant?: BadgeVariant } | null
    

    priority?: boolean
    

    lcp?: boolean
    
    showImageThumbnails?: boolean
  }>(),
  {
    featured: false,
    showWishlist: true,
    badge: null,
    priority: false,
    lcp: false,
    showImageThumbnails: false,
    layout: undefined,
    presentation: 'full',
  },
)

const isDetailed = computed(
  () => (props.layout ?? (useRuntimeConfig().public as any).cardLayout) === 'detailed',
)

const isMinimal = computed(() => props.presentation === 'minimal')
const isFlat = computed(() => props.presentation === 'flat')

const isShowcase = computed(() => isMinimal.value || isFlat.value)

const effectiveShowWishlist = computed(() => props.showWishlist && !isMinimal.value)

const imgLoading = computed<'eager' | 'lazy'>(() => (props.priority || props.lcp ? 'eager' : 'lazy'))
const imgFetchPriority = computed<'high' | undefined>(() => (props.lcp ? 'high' : undefined))
const imageThumbnails = computed(() => props.showImageThumbnails
  ? (props.product.imageThumbnails ?? []).filter(Boolean).slice(0, 6)
  : [],
)

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const { t, prime } = useT()

prime?.([
  'product.add_to_cart',
  'product.add_to_quote',
  'product.login_to_see_prices',
  'product.out_of_stock',
  'product.out_of_stock_short',
  'catalogue.savings_amount',
  'catalogue.savings_save',
])
const { showPrices, isB2b } = useB2bVisibility()
const { resolvedClientId } = useClientDetection()
const { addToCart } = useServerCart(resolvedClientId.value)
const { open: openCartDrawer } = useCartDrawer()
const { addToQuote } = useQuoteCart()
const { open: openQuoteDrawer } = useQuoteDrawer()

const qty = ref(1)
function setQty(v: number) { qty.value = Math.max(1, v) }

const isOutOfStock = computed(
  () => typeof props.product.stockQuantity === 'number' && props.product.stockQuantity <= 0,
)

const aliasesLabel = computed(() => {
  const a = props.product.aliases
  if (!a || !a.length) return ''
  const shown = a.slice(0, 3)
  const rest = a.length - shown.length
  return rest > 0 ? `${shown.join(' · ')} · +${rest}` : shown.join(' · ')
})

async function quickCart() {
  if (isOutOfStock.value) return
  const p = props.product
  
  
  
  
  
  await addToCart(
    {
      id: p.id,
      name: p.name,
      price: p.pricePromo || p.price,
      priceRaw: p.pricePromoRaw ?? p.priceRaw ?? 0,
      image: p.image ?? undefined,
      ref: p.ref ?? '',
      format: p.format,
      packaging: p.packaging,
      caliber: p.caliber,
      pricePerKgFormatted: hasPromo.value
        ? (p.pricePerKgPromoFormatted ?? p.pricePerKgFormatted)
        : p.pricePerKgFormatted,
      taxRate: p.taxRate,
      priceFormattedBeforeDiscount: hasPromo.value ? p.price : undefined,
      pricePerKgFormattedBeforeDiscount: hasPromo.value ? p.pricePerKgFormatted : undefined,
      reductionLabel: hasPromo.value ? p.reductionLabel : undefined,
      unitLabel: p.unitLabel,
    },
    qty.value,
  )
  openCartDrawer()
}
function quickQuote() {
  const p = props.product
  addToQuote(
    { id: p.id, name: p.name, reference: p.ref ?? '', image: p.image ?? undefined },
    qty.value,
  )
  openQuoteDrawer()
}

const productUrl = computed(() => props.product.url || `/produit/${props.product.id}`)

const effectiveBadge = computed(() => {
  if (props.badge) return props.badge
  if (props.product.reductionLabel) {
    return { text: props.product.reductionLabel, variant: 'promo' as BadgeVariant }
  }
  return null
})

const badgeClass = computed(() => {
  const v = effectiveBadge.value?.variant ?? 'custom'
  if (v === 'promo') return 'bg-red-600 text-white'
  if (v === 'top') return 'bg-primary-600 text-white uppercase tracking-wider'
  if (v === 'new') return 'bg-emerald-600 text-white'
  
  if (v === 'warning') return 'bg-amber-400 text-slate-900'
  return 'bg-slate-900 text-white'
})

function multiBadgeClass(v: 'promo' | 'new' | 'custom'): string {
  if (v === 'new') return 'bg-primary-600 text-white'
  return 'bg-red-600 text-white'
}

const hasPromo = computed(
  () => !!(props.product.pricePromo && props.product.pricePromoRaw != null),
)

const displayPrice = computed(() => {
  const p = props.product
  if (hasPromo.value) {
    if (p.pricePromoRaw != null) return fmtEur(p.pricePromoRaw * qty.value)
    return p.pricePromo
  }
  if (p.priceRaw != null) return fmtEur(p.priceRaw * qty.value)
  return p.price
})

const displayOriginalPrice = computed(() => {
  const p = props.product
  if (p.priceRaw != null) return fmtEur(p.priceRaw * qty.value)
  return p.price
})

const displaySavings = computed(() => {
  const p = props.product
  if (p.priceRaw != null && p.pricePromoRaw != null) {
    return fmtEur(Math.max(0, (p.priceRaw - p.pricePromoRaw) * qty.value))
  }
  return p.savingsFormatted
})

const savingsLabel = computed(() => {
  const montant = displaySavings.value
  if (!montant) return ''
  return isDetailed.value
    ? t('catalogue.savings_amount', '{amount} de réduction', { amount: montant })
    : t('catalogue.savings_save', '· Économisez {amount}', { amount: montant })
})
</script>

<template>
  
  
  <div :class="['group relative', featured ? 'lg:h-[800px]' : 'h-full']">
    <div
      :class="isShowcase
        ? 'flex h-full flex-col overflow-hidden transition-all'
        : 'flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-primary-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900'"
    >
      
      <div class="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1.5">
        <ClientOnly>
          <template v-if="product.badges && product.badges.length > 0 && showPrices">
            <span
              v-for="(b, i) in product.badges.slice(0, 2)"
              :key="i"
              :class="[
                'rounded-full px-2.5 py-1 text-xs font-bold uppercase shadow',
                multiBadgeClass(b.variant),
              ]"
            >
              {{ b.text }}
            </span>
          </template>
          <span
            v-else-if="effectiveBadge && showPrices"
            :class="[
              'rounded-full px-2.5 py-1 text-xs font-bold shadow',
              badgeClass,
            ]"
          >
            {{ effectiveBadge.text }}
          </span>
        </ClientOnly>
        <span
          v-if="typeof product.stockQuantity === 'number' && product.stockQuantity <= 0"
          class="flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-red-700 shadow ring-1 ring-red-200 dark:bg-slate-900/90 dark:text-red-400 dark:ring-red-900"
          :title="t('catalogue.out_of_stock_full', 'Produit en rupture de stock')"
        >
          <span class="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          {{ t('catalogue.out_of_stock', 'Rupture') }}
        </span>
      </div>

      
      <div
        v-if="effectiveShowWishlist"
        class="absolute right-2 top-2 z-10"
        @click.stop
      >
        <WishlistButton :product-id="product.id" variant="icon" />
      </div>
      <img
        v-else-if="isMinimal && product.brandLogo"
        :src="product.brandLogo"
        alt=""
        class="pointer-events-none absolute right-2 top-2 z-10 h-5 w-auto object-contain"
        loading="lazy"
      >

      
      <div
        :class="[
          // Fond gris : `mix-blend-multiply` sur l'image y fond le blanc des
          // photos détourées sur fond blanc, comme sur la maquette.
          isShowcase ? 'overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800' : 'overflow-hidden bg-white dark:bg-slate-800',
          featured ? 'aspect-[2/1] lg:aspect-auto lg:h-[36rem]' : 'aspect-square',
        ]"
      >
        <img
          v-if="featured && product.imageLarge"
          :src="product.imageLarge"
          :srcset="product.imageSrcset"
          :sizes="product.imageSrcset ? '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw' : undefined"
          :alt="product.name"
          width="600"
          height="450"
          class="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          :class="isShowcase ? 'mix-blend-multiply' : ''"
          :loading="imgLoading"
          :fetchpriority="imgFetchPriority"
        />
        <img
          v-else-if="product.image"
          :src="product.image"
          :srcset="product.imageSrcset"
          :sizes="product.imageSrcset ? '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw' : undefined"
          :alt="product.name"
          width="300"
          height="300"
          class="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          :class="isShowcase ? 'mix-blend-multiply' : ''"
          :loading="imgLoading"
          :fetchpriority="imgFetchPriority"
        />
        <div v-else class="flex h-full w-full items-center justify-center text-slate-300">
          <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </div>
      </div>

      
      <div v-if="imageThumbnails.length" class="flex gap-1.5 px-3 pt-2" aria-hidden="true">
        <img
          v-for="(thumbnail, index) in imageThumbnails"
          :key="thumbnail"
          :src="thumbnail"
          alt=""
          width="40"
          height="40"
          :class="[
            'h-10 w-10 rounded border object-contain p-0.5',
            index === 0 ? 'border-slate-500 dark:border-slate-400' : 'border-slate-200 dark:border-slate-700',
          ]"
          loading="lazy"
        >
      </div>

      
      <div :class="isShowcase ? 'flex flex-1 flex-col pt-3' : 'flex flex-1 flex-col p-4'">
      <h3
        :class="[
          isShowcase
            ? 'mb-1 line-clamp-2 font-normal text-gray-900 transition-colors group-hover:underline dark:text-slate-100'
            : 'mb-2 line-clamp-2 font-semibold text-slate-900 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400',
          featured ? 'text-lg sm:text-xl' : isShowcase ? 'text-base' : 'text-sm',
        ]"
      >
        <NuxtLink :to="productUrl" class="after:absolute after:inset-0">{{ product.name }}</NuxtLink>
      </h3>

      
      <div
        v-if="product.attributes && product.attributes.length > 0"
        :class="['mb-2 flex flex-wrap gap-1', (isDetailed || isMinimal || isFlat) ? 'order-first' : '']"
      >
        <span
          v-for="attr in product.attributes.slice(0, 3)"
          :key="attr"
          :class="[
            'inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            (isMinimal || isFlat) ? 'uppercase tracking-wide' : '',
          ]"
        >{{ attr }}</span>
      </div>

      
      <div
        v-else-if="product.format || product.packaging || product.caliber"
        :class="['mb-2 flex flex-wrap gap-1', (isDetailed || isMinimal || isFlat) ? 'order-first' : '']"
      >
        <span
          v-if="product.format"
          class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >{{ product.format }}</span>
        <span
          v-if="product.packaging"
          class="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
        >{{ product.packaging }}</span>
        <span
          v-if="product.caliber"
          class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        >{{ product.caliber }}</span>
      </div>

      
      <ProductRating
        v-if="(isDetailed || isMinimal || isFlat) && product.reviewCount"
        :rating="product.rating"
        :count="product.reviewCount"
        class="mb-2"
      />

      <p v-if="product.ref && !isMinimal" class="mb-2 text-xs text-slate-500">{{ t('product.ref') }} {{ product.ref }}</p>
      
      <p v-if="aliasesLabel && !isMinimal" class="-mt-1 mb-2 text-xs text-slate-500">{{ t('product.oe_refs', 'Réf. constructeur') }} {{ aliasesLabel }}</p>

      
      <p
        v-if="featured && product.descriptionShort"
        class="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
      >{{ product.descriptionShort }}</p>

      
      <ClientOnly>
        <template v-if="showPrices">
          
          <template v-if="product.pricePerKgFormatted">
            <div class="flex items-baseline gap-2">
              <span
                :class="[
                  'font-bold',
                  isDetailed ? 'text-slate-900 dark:text-white' : 'text-primary-700 dark:text-primary-400',
                  featured ? 'text-2xl sm:text-3xl' : 'text-xl',
                ]"
              >{{ hasPromo && product.pricePerKgPromoFormatted ? product.pricePerKgPromoFormatted : product.pricePerKgFormatted }}</span>
              <span
                :class="[
                  'text-xs font-semibold',
                  isDetailed ? 'text-slate-500 dark:text-slate-400' : 'text-primary-700 dark:text-primary-400',
                ]"
              >{{ product.unitLabel || 'HT/K' }}</span>
              <span
                v-if="hasPromo && product.pricePerKgPromoFormatted"
                :class="isDetailed
                  ? 'text-sm text-slate-500 line-through'
                  : 'text-sm text-red-600 line-through'"
              >{{ product.pricePerKgFormatted }}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <template v-if="product.taxRate">TVA à {{ product.taxRate.toString().replace('.', ',') }} %, soit pour {{ qty === 1 ? 'un colis' : `${qty} colis` }} :<br></template>
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ displayPrice }} HT</span>
              <template v-if="hasPromo">
                <span :class="isDetailed ? 'ml-1 text-slate-500 line-through' : 'ml-1 text-red-600 line-through'">{{ displayOriginalPrice }}</span>
                <span v-if="displaySavings" :class="isDetailed ? 'ml-1 font-semibold text-slate-600 dark:text-slate-300' : 'ml-1 font-semibold text-red-600'">{{ savingsLabel }}</span>
              </template>
            </p>
          </template>
          <template v-else>
            <div class="flex items-baseline gap-2">
              <span
                :class="[
                  'font-bold',
                  isDetailed ? 'text-slate-900 dark:text-white' : 'text-primary-700 dark:text-primary-400',
                  featured ? 'text-xl sm:text-2xl' : 'text-base',
                ]"
              >{{ displayPrice }}</span>
              <span
                v-if="hasPromo"
                :class="isDetailed
                  ? 'text-xs text-slate-500 line-through'
                  : 'text-xs text-red-600 line-through'"
              >{{ displayOriginalPrice }}</span>
              <span v-if="isB2b" class="text-xs font-normal text-slate-500">HT</span>
              <span
                v-if="hasPromo && displaySavings"
                :class="isDetailed
                  ? 'text-xs font-semibold text-slate-600 dark:text-slate-300'
                  : 'text-xs font-semibold text-red-600'"
              >{{ savingsLabel }}</span>
            </div>
          </template>
        </template>
        <p v-else-if="isB2b" class="mb-1 text-xs italic text-slate-500">{{ t('product.login_to_see_prices') }}</p>
        <template #fallback>
          <div class="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </template>
      </ClientOnly>

      
      <div
        v-if="!isMinimal"
        class="relative z-10 mt-auto flex flex-col gap-2 pt-3"
        @click.stop
      >
        <div class="flex flex-col items-start gap-1.5 sm:flex-row sm:items-stretch sm:gap-2">
          <div
            class="flex shrink-0 items-center rounded-md border border-slate-200 dark:border-slate-700"
            :class="isOutOfStock ? 'opacity-50' : ''"
          >
            <button
              class="flex h-10 w-9 sm:h-11 items-center justify-center text-sm text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:hover:text-slate-500"
              :disabled="isOutOfStock"
              @click="setQty(qty - 1)"
            >−</button>
            <span class="flex h-10 w-8 sm:h-11 items-center justify-center text-sm font-semibold text-slate-900 dark:text-white">{{ qty }}</span>
            <button
              class="flex h-10 w-9 sm:h-11 items-center justify-center text-sm text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:hover:text-slate-500"
              :disabled="isOutOfStock"
              @click="setQty(qty + 1)"
            >+</button>
          </div>
          <ClientOnly>
            <button
              v-if="showPrices"
              class="w-full sm:w-auto sm:flex-1 sm:min-w-0 h-10 sm:h-11 rounded-lg px-4 text-sm font-semibold transition-colors"
              :class="isOutOfStock
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
                : 'bg-primary-600 text-white hover:bg-primary-700'"
              :disabled="isOutOfStock"
              :title="isOutOfStock ? t('product.out_of_stock') : ''"
              @click="quickCart"
            >{{ isOutOfStock ? t('product.out_of_stock_short') : t('product.add_to_cart') }}</button>
            <button
              v-else
              class="w-full sm:w-auto sm:flex-1 sm:min-w-0 h-10 sm:h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              @click="quickQuote"
            >{{ t('product.add_to_quote') }}</button>
            <template #fallback>
              <div class="w-full sm:w-auto sm:flex-1 h-10 sm:h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </template>
          </ClientOnly>
        </div>
        <ChatbotProductButton :product-id="product.id" :qty="qty" variant="card" />
      </div>
      </div>
    </div>
  </div>
</template>
