
<script setup lang="ts">
import { resolveProductLayoutFlags } from '~/utils/product-layout-flags'
import { isOutOfStock as stockEpuise } from '~/utils/product-availability'
import { pairesDeclinaison } from '~/utils/cart-line-layout'
import { groupProductFeatures } from '~/utils/product-features'
import { priceBeforeDiscount } from '~/utils/price-before-discount'
import { responsiveImagePreloadLink } from '~/utils/image-preload'

const { localePath } = useLocalePath()
interface AttachmentRow {
  id: number
  name: string
  fileName: string
  mime: string
  fileSize: number
}

interface ProductSpec {
  countryOrigin?: string | null
  shelfLifeMonths?: number | null
  processProduction?: string | null
  storageTemperature?: string | null
  storageHumidity?: string | null
  ingredients?: Array<{ name: string; pct?: number; origin?: string | null }>
  allergens?: string[]
  nutri?: {
    energyKj?: number | null
    energyKcal?: number | null
    fatG?: number | null
    satFatG?: number | null
    carbsG?: number | null
    sugarsG?: number | null
    proteinsG?: number | null
    saltG?: number | null
  }
  compliance?: { isIonised: boolean | null; hasNanomaterials: boolean | null; isNonGmo: boolean | null }
  pack?: {
    container?: string | null
    unitWeight?: string | null
    unitsPerCarton?: number | null
    cartonWeight?: string | null
    cartonsPerPallet?: number | null
    gencod?: string | null
    material?: string | null
  }
}

interface ProductLike {
  id: number
  name: string
  
  h1?: string
  
  faq?: Array<{ position: number; question: string; answer_html: string }>
  reference?: string
  

  aliasGroups?: Array<{ kind: 'oe' | 'bosch_new' | 'bosch_exchange' | 'other'; values: string[] }>
  

  fitments?: Array<{
    brand: string
    brandSlug: string
    models: Array<{
      model: string
      modelSlug: string
      engines: Array<{ engine: string; powerCv: number; generation: string; yearFrom: number | null; yearTo: number | null }>
    }>
  }>
  
  manufacturer?: string
  price?: number | string
  priceFormatted?: string
  priceRaw?: number
  weight?: number | string
  description?: string
  descriptionShort?: string
  description_short?: string
  images?: string[]
  

  imagesByCombination?: Record<number, string[]>
  imageSets?: Array<{ src: string; srcset: string; fallback: string; slug: string }>
  features?: Array<{ id?: number; name: string; value: string }>
  attachments?: AttachmentRow[]
  spec?: ProductSpec
  
  priceFormattedBeforeDiscount?: string
  priceRawBeforeDiscount?: number
  pricePerKgRaw?: number
  pricePerKgFormatted?: string
  pricePerKgFormattedBeforeDiscount?: string
  reductionLabel?: string
  
  quantityBreaks?: Array<{ fromQuantity: number; priceRaw: number; priceFormatted: string; reductionLabel?: string }>
  taxRate?: number
  
  unitLabel?: string
  

  quantity?: number
  
  combinations?: Array<{
    id: number
    reference?: string
    price?: number
    quantity?: number
    defaultOn?: boolean
    attributes?: Array<{ groupId: number; group: string; attributeId: number; value: string; isColorGroup?: boolean; color?: string }>
  }>
  

  highlights?: Array<{ imageUrl: string | null; title: string | null; text: string | null }>
  

  related?: Array<Record<string, any>>
  

  reviews?: { average: number | null; count: number }
}

interface BreadcrumbItem { label: string; path: string }

const props = withDefaults(defineProps<{
  product: ProductLike
  breadcrumb?: BreadcrumbItem[] | null
  pilier?: string
  clientId?: string
  cartTenant?: string
}>(), {
  breadcrumb: () => null,
  pilier: '',
  clientId: () => String((useRuntimeConfig().public as any).clientId ?? ''),
  cartTenant: () => String((useRuntimeConfig().public as any).clientId ?? ''),
})

const { t, prime } = useT()

prime?.([
  'auth.login_create_account',
  'cart.article',
  'cart.articles',
  'catalogue.add_short',
  'catalogue.add_to_cart',
  'catalogue.add_to_quote',
  'catalogue.added_to_cart',
  'catalogue.added_to_quote',
  'catalogue.label_ht',
  'catalogue.price_pro_only',
  'catalogue.product_view_cart',
  'catalogue.product_view_quote',
  'catalogue.product_weight',
  'catalogue.quote_short',
  'product.notify_already_registered',
  'product.notify_back_in_stock',
  'product.notify_email_placeholder',
  'product.notify_error',
  'product.notify_submit',
  'product.notify_success',
  'product.out_of_stock',
  'product.total_breakdown',
])
const productLayoutFlags = computed(() => resolveProductLayoutFlags(useRuntimeConfig().public as any))
const breadcrumbHidden = computed(() => productLayoutFlags.value.breadcrumb === 'hidden')
const { showPrices, isB2b } = useB2bVisibility()

const { showClickCollect } = useClickCollect()

const isSport = computed(() => (useRuntimeConfig().public as any).productLayout === 'sport')

function normalizeFeatureName(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
const cardAttributesConfig = computed<string[]>(() => {
  const raw = (useRuntimeConfig().public as any).cardAttributes
  return Array.isArray(raw) ? raw.filter(Boolean).map(String) : []
})

const sameDayShippingConfig = computed(() => (useRuntimeConfig().public as any).sameDayShipping)
const sameDayEnabled = computed(() => !!sameDayShippingConfig.value)
const sameDayCutoffHour = computed(() =>
  typeof sameDayShippingConfig.value === 'object' && sameDayShippingConfig.value?.cutoffHour
    ? Number(sameDayShippingConfig.value.cutoffHour)
    : 15
)
const sameDayTimezone = computed(() =>
  typeof sameDayShippingConfig.value === 'object' && sameDayShippingConfig.value?.timezone
    ? String(sameDayShippingConfig.value.timezone)
    : 'Europe/Paris'
)

const quantity = ref(1)
function increment() { quantity.value++ }
function decrement() { if (quantity.value > 1) quantity.value-- }

const combinations = computed(() => Array.isArray(props.product.combinations) ? props.product.combinations : [])
const hasCombinations = computed(() => combinations.value.length > 0)
const selectedCombinationId = ref<number | null>(null)

watchEffect(() => {
  if (!hasCombinations.value) return
  if (selectedCombinationId.value !== null) return
  const inStock = combinations.value.find(c => (c.quantity ?? 0) > 0)
  const def = combinations.value.find(c => c.defaultOn && (c.quantity ?? 0) > 0)
  selectedCombinationId.value = (def ?? inStock ?? combinations.value[0])?.id ?? null
})

const selectedCombination = computed(() => combinations.value.find(c => c.id === selectedCombinationId.value) ?? null)
const selectedStock = computed(() => selectedCombination.value?.quantity ?? 0)

const isOutOfStock = computed(() =>
  stockEpuise(props.product as any, hasCombinations.value ? selectedCombinationId.value : undefined),
)

const attributeGroups = computed(() => {
  const map = new Map<number, { id: number; name: string; isColorGroup: boolean; values: Array<{ id: number; value: string; color: string; combinationId: number; quantity: number }> }>()
  for (const c of combinations.value) {
    for (const a of (c.attributes ?? [])) {
      if (!map.has(a.groupId)) map.set(a.groupId, { id: a.groupId, name: a.group, isColorGroup: Boolean(a.isColorGroup), values: [] })
      map.get(a.groupId)!.values.push({
        id: a.attributeId,
        value: a.value,
        color: String(a.color || ''),
        combinationId: c.id,
        quantity: c.quantity ?? 0,
      })
    }
  }
  return Array.from(map.values())
})

function isDepositGroup(group: { name: string }): boolean {
  return /consigne|deposit|pfand|caution/i.test(group.name)
}

const hasDeposit = computed((): boolean => attributeGroups.value.some(g => isDepositGroup(g)))

const { addToCart: cartAdd, totalItems } = useServerCart(props.cartTenant)
const { open: openCartDrawer } = useCartDrawer()
const addedToCart = ref(false)

const notifyEmail = ref('')
const notifyStatus = ref<'idle' | 'ok' | 'duplicate' | 'error'>('idle')
const notifyLoading = ref(false)

async function submitStockAlert() {
  if (!notifyEmail.value) return
  notifyLoading.value = true
  notifyStatus.value = 'idle'
  try {
    const result = await $fetch<{ status: string }>('/api/catalogue/stock-alert', {
      method: 'POST',
      body: {
        productId: props.product.id,
        productAttributeId: selectedCombinationId.value ?? 0,
        email: notifyEmail.value,
      },
    })
    notifyStatus.value = result.status === 'duplicate' ? 'duplicate' : 'ok'
  } catch {
    notifyStatus.value = 'error'
  } finally {
    notifyLoading.value = false
  }
}

const { addToQuote, totalItems: quoteTotalItems } = useQuoteCart()
const { open: openQuoteDrawer } = useQuoteDrawer()
const addedToQuote = ref(false)

async function addToCart() {
  if (isOutOfStock.value) return
  
  
  const custom = personalizationActive.value
    ? {
        text: personalText.value.trim(),
        colorHex: personalColor.value,
        colorLabel: textileColors.value.find(c => c.hex === personalColor.value)?.label,
        fee: textileFee.value,
        kind: 'textile' as const,
      }
    : undefined
  const priceRaw = effectiveUnitPriceRaw.value + (custom ? textileFee.value : 0)
  let refuse = false
  await cartAdd({
    id: props.product.id,
    name: props.product.name,
    price: custom ? formatEur(priceRaw) : (effectiveUnitPriceRaw.value > 0 ? formatEur(effectiveUnitPriceRaw.value) : (props.product.priceFormatted ?? String(props.product.price ?? ''))),
    priceRaw,
    image: galleryImages.value[0],
    ref: props.product.reference,
    customization: custom,
    
    
    
    
    
    
    
    combinationId: selectedCombinationId.value ?? undefined,
    variantLabel: selectedCombination.value?.attributes?.map(a => a.value).join(' · ') || undefined,
    variantAttributes: pairesDeclinaison(selectedCombination.value?.attributes),
    
    
    taxRate: props.product.taxRate,
  }, quantity.value).catch(() => { refuse = true })
  
  if (refuse) { openCartDrawer(); return }
  addedToCart.value = true
  openCartDrawer()
  setTimeout(() => { addedToCart.value = false }, 2000)
}

const accessoryQty = ref<Record<number, number>>({})
const accessoryAdded = ref<Record<number, boolean>>({})
function getAccessoryQty(id: number): number { return accessoryQty.value[id] ?? 1 }
function setAccessoryQty(id: number, v: number) {
  accessoryQty.value = { ...accessoryQty.value, [id]: Math.max(1, Number(v) || 1) }
}
async function addAccessoryToCartOrQuote(acc: any) {
  const qty = getAccessoryQty(acc.id)
  if (showPrices.value) {
    await cartAdd({
      id: acc.id, name: acc.name, price: acc.priceFormatted, priceRaw: acc.price,
      image: acc.image, ref: '',
    }, qty)
    openCartDrawer()
  } else {
    addToQuote({ id: acc.id, name: acc.name, reference: '', image: acc.image }, qty)
    openQuoteDrawer()
  }
  accessoryAdded.value = { ...accessoryAdded.value, [acc.id]: true }
  setTimeout(() => { accessoryAdded.value = { ...accessoryAdded.value, [acc.id]: false } }, 2000)
}

function addProductToQuote() {
  addToQuote({
    id: props.product.id,
    name: props.product.name,
    reference: props.product.reference,
    image: galleryImages.value[0],
  }, quantity.value)
  addedToQuote.value = true
  openQuoteDrawer()
  setTimeout(() => { addedToQuote.value = false }, 2000)
}

const selectedImage = ref(0)

const galleryImages = computed<string[]>(() => {
  const id = selectedCombinationId.value
  const propres = id != null ? props.product.imagesByCombination?.[id] : undefined
  return (propres?.length ? propres : props.product.images) ?? []
})
const isCombinationGallery = computed(() =>
  galleryImages.value.length > 0 && galleryImages.value !== props.product.images,
)

const selectedSrcset = computed(() => {
  if (isCombinationGallery.value) return undefined
  return props.product.imageSets?.[selectedImage.value]?.srcset ?? props.product.imageSets?.[0]?.srcset
})

function thumbSrcset(i: number): string | undefined {
  if (isCombinationGallery.value) return undefined
  return props.product.imageSets?.[i]?.srcset
}

watch(galleryImages, () => { selectedImage.value = 0 })

const MAIN_IMAGE_SIZES = '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw'
if (import.meta.server && galleryImages.value.length) {
  const link = responsiveImagePreloadLink({
    src: galleryImages.value[0],
    srcset: selectedSrcset.value,
    sizes: selectedSrcset.value ? MAIN_IMAGE_SIZES : undefined,
  })
  if (link) useHead({ link: [link] })
}

const features = computed(() => Array.isArray(props.product.features) ? props.product.features : [])

function aliasKindLabel(kind: 'oe' | 'bosch_new' | 'bosch_exchange' | 'other'): string {
  switch (kind) {
    case 'oe': return t('product.alias_kind_oe', 'Référence constructeur')
    case 'bosch_new': return t('product.alias_kind_bosch_new', 'Équivalent neuf')
    case 'bosch_exchange': return t('product.alias_kind_bosch_exchange', 'Équivalent échange standard')
    default: return t('product.alias_kind_other', 'Autre référence')
  }
}
const aliasGroups = computed(() => {
  const groups = props.product.aliasGroups
  if (!Array.isArray(groups) || !groups.length) return []
  return groups
    .filter(g => g.values?.length)
    .map(g => ({ label: aliasKindLabel(g.kind), values: g.values }))
})

function normalizePartRef(s: string): string {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const route = typeof useRoute === 'function' ? useRoute() : null
const querySearchedRef = computed(() => {
  const q = route?.query?.ref || route?.query?.q || route?.query?.search
  return typeof q === 'string' ? q.trim() : ''
})

const manualSearchedRef = ref('')
const activeSearchedRef = computed(() => manualSearchedRef.value.trim() || querySearchedRef.value)
const activeSearchedRefNorm = computed(() => normalizePartRef(activeSearchedRef.value))

const refMatchResult = computed((): { matched: boolean; ref: string; kindLabel: string } | null => {
  const norm = activeSearchedRefNorm.value
  if (!norm || norm.length < 3) return null

  
  const mainNorm = normalizePartRef(props.product.reference || '')
  if (mainNorm && (mainNorm === norm || mainNorm.includes(norm) || norm.includes(mainNorm))) {
    return {
      matched: true,
      ref: props.product.reference || activeSearchedRef.value,
      kindLabel: t('product.matched_ref_main', "Référence d'origine"),
    }
  }

  
  const groups = props.product.aliasGroups || []
  for (const g of groups) {
    for (const val of g.values || []) {
      const valNorm = normalizePartRef(val)
      if (valNorm && (valNorm === norm || valNorm.includes(norm) || norm.includes(valNorm))) {
        return {
          matched: true,
          ref: val,
          kindLabel: aliasKindLabel(g.kind),
        }
      }
    }
  }

  return {
    matched: false,
    ref: activeSearchedRef.value,
    kindLabel: '',
  }
})

function isAliasHighlighted(val: string): boolean {
  const norm = activeSearchedRefNorm.value
  if (!norm || norm.length < 3) return false
  const valNorm = normalizePartRef(val)
  return valNorm === norm || valNorm.includes(norm) || norm.includes(valNorm)
}

const reviewAggregate = computed(() => {
  const r = props.product.reviews
  if (!r || !r.count || r.count <= 0) return null
  const average = Number(r.average) || 0
  return average > 0 ? { average, count: r.count } : null
})

const reassuranceItems = computed(() => {
  const raw = (useRuntimeConfig().public as any).productReassurance
  return Array.isArray(raw) && raw.length
    ? raw as Array<{ icon?: string; key: string; fallback?: string }>
    : null
})

function reassuranceIconPath(name?: string): string {
  switch (name) {
    case 'clock': return 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
    case 'shield': return 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z'
    case 'refresh': return 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99'
    case 'truck': return 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.25 2.25 0 0 0-.659-1.591l-2.56-2.56a2.25 2.25 0 0 0-1.591-.659H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12'
    case 'lock': return 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z'
    default: return 'm4.5 12.75 6 6 9-13.5'
  }
}

const partnerReviewsConfig = computed(() => (useRuntimeConfig().public as any).partnerReviews)
const partnerReviewsEnabled = computed(() => Boolean(partnerReviewsConfig.value))

const partnerReviewsData = ref<any>(null)

const partnerReviewsRating = computed(() => {
  const cfg = partnerReviewsConfig.value
  if (typeof cfg === 'object' && cfg?.rating) return String(cfg.rating)
  const apiRating = partnerReviewsData.value?.business?.total_rating
  return apiRating ? Number(apiRating).toFixed(1) : '4.9'
})

const partnerReviewsCount = computed(() => {
  const cfg = partnerReviewsConfig.value
  if (typeof cfg === 'object' && cfg?.count) return Number(cfg.count)
  return partnerReviewsData.value?.total || 12
})

const partnerReviewQuote = computed(() => {
  const list = partnerReviewsData.value?.reviews
  if (Array.isArray(list) && list.length > 0) {
    const featured = list.find((r: any) => r.rating === 5 && r.company) || list[0]
    return {
      text: featured.title ? `${featured.title} — ${featured.text}` : featured.text,
      author: featured.company ? `${featured.company}` : featured.author,
    }
  }
  return {
    text: t('product.partner_reviews_sample_quote', 'Pièce échange standard impeccable, expédiée le jour même. Montage direct sans adaptation.'),
    author: t('product.partner_reviews_sample_author', 'Moser Kfz-Technik (Atelier partenaire)'),
  }
})

const stickyMobileCartEnabled = computed(() => {
  const cfg = (useRuntimeConfig().public as any).stickyMobileAddToCart
  return Boolean(cfg)
})
const showStickyMobileCart = ref(false)
let stickyCartObserver: IntersectionObserver | null = null

const fitmentBrands = computed(() => {
  const brands = props.product.fitments
  if (!Array.isArray(brands) || !brands.length) return []
  const unit = t('catalogue.fitment_power_unit', 'cv')
  return brands.map(b => ({
    brand: b.brand,
    models: b.models.map(m => ({
      model: m.model,
      engines: m.engines.map((e) => {
        const parts: string[] = []
        if (e.generation && e.generation !== m.model) parts.push(e.generation)
        if (e.engine) parts.push(e.engine)
        if (e.powerCv > 0) parts.push(`${e.powerCv} ${unit}`)
        if (e.yearFrom || e.yearTo) parts.push(`${e.yearFrom ?? '…'}-${e.yearTo ?? '…'}`)
        return parts.join(' · ')
      }),
    })),
  }))
})
const fitmentEngineCount = computed(() =>
  fitmentBrands.value.reduce((n, b) => n + b.models.reduce((k, m) => k + m.engines.length, 0), 0))

const fitmentSearchQuery = ref('')
const filteredFitmentBrands = computed(() => {
  const query = fitmentSearchQuery.value.trim().toLowerCase()
  if (!query) return fitmentBrands.value

  const queryTokens = query.split(/\s+/).filter(Boolean)

  return fitmentBrands.value
    .map((b) => {
      const brandMatches = queryTokens.every(token => b.brand.toLowerCase().includes(token))
      if (brandMatches) {
        return b
      }

      const matchingModels = b.models.filter((m) => {
        const modelText = `${b.brand} ${m.model} ${m.engines.join(' ')}`.toLowerCase()
        return queryTokens.every(token => modelText.includes(token))
      })

      if (!matchingModels.length) return null

      return {
        brand: b.brand,
        models: matchingModels,
      }
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)
})
const filteredFitmentEngineCount = computed(() =>
  filteredFitmentBrands.value.reduce((n, b) => n + b.models.reduce((k, m) => k + m.engines.length, 0), 0)
)

const BRANDS_KNOWN_MODELS: Record<string, string[]> = {
  AUDI: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'q2', 'q3', 'q5', 'q7', 'tt'],
  VOLKSWAGEN: ['golf', 'passat', 'touran', 'polo', 'tiguan', 'caddy', 'sharan', 'scirocco', 'jetta', 'transporter', 'crafter', 'eos', 'beetle', 'touareg', 'arteon'],
  SEAT: ['leon', 'ibiza', 'altea', 'toledo', 'arona', 'ateca', 'tarraco', 'alhambra', 'mii'],
  SKODA: ['octavia', 'fabia', 'superb', 'kodiaq', 'karoq', 'yeti', 'rapid', 'scala', 'kamiq'],
  PEUGEOT: ['206', '207', '208', '307', '308', '3008', '5008', '508', '2008', 'partner', 'expert', 'boxer', '1007', '407', '607', '807', 'rcz', 'rifter'],
  CITROËN: ['c2', 'c3', 'c4', 'c5', 'c3 picasso', 'c4 picasso', 'c4 grand picasso', 'xsara', 'xsara picasso', 'berlingo', 'jumpy', 'jumper', 'ds3', 'ds4', 'ds5'],
  RENAULT: ['clio', 'megane', 'scenic', 'grand scenic', 'captur', 'kadjar', 'kangoo', 'trafic', 'master', 'espace', 'laguna', 'twingo', 'koleos', 'talisman'],
  DACIA: ['duster', 'sandero', 'logan', 'lodgy', 'dokker', 'jogger'],
  FORD: ['focus', 'fiesta', 'c-max', 'grand c-max', 's-max', 'galaxy', 'mondeo', 'kuga', 'transit', 'transit custom', 'connect', 'tourneo', 'ranger', 'fusion'],
  BMW: ['serie 1', 'serie 2', 'serie 3', 'serie 4', 'serie 5', 'x1', 'x3', 'x5'],
  MERCEDES: ['classe a', 'classe b', 'classe c', 'classe e', 'gla', 'glc', 'vito', 'sprinter'],
  MINI: ['mini', 'clubman', 'countryman', 'cooper'],
  OPEL: ['corsa', 'astra', 'insignia', 'zafira', 'mokka', 'meriva', 'vivaro', 'movano', 'combo'],
  FIAT: ['500', 'punto', 'grande punto', 'panda', 'tipo', 'doblo', 'ducato', 'fiorino'],
  NISSAN: ['qashqai', 'juke', 'x-trail', 'micra', 'navara', 'nv200', 'nv300', 'nv400'],
  VOLVO: ['c30', 's40', 'v40', 'v50', 'v60', 'v70', 'xc60', 'xc90', 's60', 's80'],
  MAZDA: ['2', '3', '5', '6', 'cx-3', 'cx-5'],
}

function formatBrand(b: string): string {
  if (/volkswagen/i.test(b)) return 'VW'
  return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase()
}

function formatModel(m: string): string {
  if (m.length <= 3) return m.toUpperCase()
  return m.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

const compatibleVehiclesSummary = computed((): string | null => {
  const feats = props.product.features
  if (!Array.isArray(feats) || !feats.length) return null

  const brandFeatures = feats.filter(f => /^(marque|marke|brand|make)$/i.test(f.name)).map(f => String(f.value || '').trim().toUpperCase())
  const modelFeatures = feats.filter(f => /^(mod[eèé]le|modell?)$/i.test(f.name)).map(f => String(f.value || '').trim())
  const engineFeatures = feats.filter(f => /^(motorisation|engine|motor)$/i.test(f.name)).map(f => String(f.value || '').trim())

  if (!modelFeatures.length && !brandFeatures.length) return null

  const uniqueModels = Array.from(new Set(modelFeatures.filter(Boolean)))
  const uniqueBrands = Array.from(new Set(brandFeatures.filter(Boolean)))
  const engine = engineFeatures[0] || ''

  const grouped = new Map<string, string[]>()
  const ungrouped: string[] = []

  for (const m of uniqueModels) {
    const mLower = m.toLowerCase()
    let foundBrand: string | null = null
    for (const b of uniqueBrands) {
      const known = BRANDS_KNOWN_MODELS[b] || []
      if (known.some(k => k === mLower || mLower.startsWith(k) || k.startsWith(mLower))) {
        foundBrand = b
        break
      }
    }
    if (foundBrand) {
      if (!grouped.has(foundBrand)) grouped.set(foundBrand, [])
      grouped.get(foundBrand)!.push(formatModel(m))
    } else {
      ungrouped.push(formatModel(m))
    }
  }

  const parts: string[] = []
  let modelCount = 0
  for (const [b, models] of grouped.entries()) {
    if (modelCount >= 6) break
    const slice = models.slice(0, 3)
    parts.push(`${formatBrand(b)} ${slice.join(', ')}`)
    modelCount += slice.length
  }

  if (modelCount < 5 && ungrouped.length) {
    const slice = ungrouped.slice(0, 5 - modelCount)
    parts.push(slice.join(', '))
    modelCount += slice.length
  }

  if (!parts.length && uniqueBrands.length) {
    parts.push(uniqueBrands.map(formatBrand).slice(0, 4).join(', '))
  }

  if (!parts.length) return null

  const remaining = uniqueModels.length - modelCount
  let text = parts.join(' · ')
  if (engine) text += ` — ${engine}`
  if (remaining > 0) text += ` (+${remaining})`

  return text
})

const sportChips = computed<string[]>(() => {
  if (!isSport.value || !cardAttributesConfig.value.length) return []
  const normalizedPatterns = cardAttributesConfig.value.map(normalizeFeatureName)
  const byName = new Map<string, string>()
  for (const f of features.value) {
    const key = normalizeFeatureName(f.name)
    if (!byName.has(key)) byName.set(key, f.value)
  }
  const out: string[] = []
  for (const pattern of normalizedPatterns) {
    const v = byName.get(pattern)
    if (v) out.push(v)
    if (out.length >= 3) break
  }
  return out
})

const calibrageFeature = computed(() =>
  features.value.find(f => /calibr|caliber/i.test(f.name)),
)

const unitPriceFeature = computed(() =>
  features.value.find(f => /prix.*(unit|kilo|kg)/i.test(f.name)),
)
const otherFeatures = computed(() => {
  const filtered = features.value.filter(f => f !== calibrageFeature.value && f !== unitPriceFeature.value)
  return groupProductFeatures(filtered)
})

const unitPriceDisplay = computed(() => {
  const raw = unitPriceFeature.value?.value?.trim()
  if (!raw) return ''
  
  const m = raw.match(/(\d+(?:[.,]\d+)?)/)
  if (!m) return raw
  const n = parseFloat(m[1].replace(',', '.'))
  if (Number.isNaN(n)) return raw
  return `${n.toString().replace('.', ',')} €/kg`
})

const lightboxOpen = ref(false)
function openLightbox() {
  if (galleryImages.value.length) lightboxOpen.value = true
}

function toOriginalImage(url?: string): string {
  if (!url) return ''
  return url.replace(/-(?:[a-z_]+_)?default(?:_?2x)?(\.[a-zA-Z]+)(\?.*)?$/, '$1$2')
}
const zoomImage = computed(() => {
  const src = galleryImages.value[selectedImage.value] ?? galleryImages.value[0]
  return toOriginalImage(src)
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const descShort = computed(() => props.product.descriptionShort ?? props.product.description_short ?? '')
const descLong = computed(() => props.product.description ?? '')

const hasLongDescription = computed(() => {
  const long = stripHtml(descLong.value)
  const short = stripHtml(descShort.value)
  if (!long) return false
  if (props.product?.name && long === props.product.name) return false
  return long.length > short.length + 40
})

const hasSpecContent = computed(() => {
  const s = props.product.spec
  if (!s) return false
  return Boolean(
    s.ingredients?.length
    || s.allergens?.length
    || s.nutri?.energyKcal != null
    || s.nutri?.energyKj != null
    || s.pack?.container
    || s.pack?.unitWeight
    || s.pack?.unitsPerCarton
    || s.pack?.cartonsPerPallet
    || s.description
    || s.usageConditions
    || s.consumerWarnings
    || s.isIonised != null
    || s.isNonGmo != null,
  )
})

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

const baseProductPriceRaw = computed((): number => {
  const raw = props.product.priceRaw
  if (raw != null && !Number.isNaN(Number(raw))) return Number(raw)
  const str = String(props.product.priceFormatted ?? props.product.price ?? '')
    .replace(/[^\d,.-]/g, '').replace(',', '.')
  const n = parseFloat(str)
  return Number.isFinite(n) ? n : 0
})

const combinationPriceDelta = computed((): number => {
  const combPrice = selectedCombination.value?.price
  if (typeof combPrice !== 'number' || Number.isNaN(combPrice) || combPrice <= 0) return 0
  const base = baseProductPriceRaw.value
  return base > 0 ? (combPrice - base) : 0
})

const isDepositPaidSelected = computed((): boolean => {
  if (combinationPriceDelta.value > 0.001) return true
  const attrs = selectedCombination.value?.attributes ?? []
  for (const a of attrs) {
    if (isDepositGroup({ name: a.group })) {
      if (/\+\s*[\d]+|réglée|paid|gezahlt/i.test(a.value)) return true
    }
  }
  return false
})

const effectiveQuantityBreaks = computed(() => {
  const breaks = props.product.quantityBreaks
  if (!breaks || !breaks.length) return []
  const delta = combinationPriceDelta.value
  if (Math.abs(delta) < 0.001) return breaks
  return breaks.map((b) => {
    const adjusted = Math.max(0, b.priceRaw + delta)
    return {
      ...b,
      priceRaw: adjusted,
      priceFormatted: formatEur(adjusted),
    }
  })
})

const unitPriceRaw = computed((): number => {
  const combPrice = selectedCombination.value?.price
  if (typeof combPrice === 'number' && combPrice > 0 && !Number.isNaN(combPrice)) {
    return combPrice
  }
  return baseProductPriceRaw.value
})

const effectiveUnitPriceRaw = computed((): number => {
  const breaks = effectiveQuantityBreaks.value
  const q = Math.max(1, Math.floor(Number(quantity.value) || 1))
  if (breaks.length) {
    let match: (typeof breaks)[number] | null = null
    for (const b of breaks) {
      if (q >= b.fromQuantity) {
        if (!match || b.fromQuantity > match.fromQuantity) {
          match = b
        }
      }
    }
    if (match) return match.priceRaw
  }
  return unitPriceRaw.value
})

const priceDisplay = computed(() => {
  if (effectiveUnitPriceRaw.value > 0) {
    return formatEur(effectiveUnitPriceRaw.value)
  }
  return props.product.priceFormatted ?? props.product.price ?? ''
})

const strikePrice = computed(() => priceBeforeDiscount({
  beforeDiscountRaw: props.product.priceRawBeforeDiscount,
  currentRaw: unitPriceRaw.value,
  optionDelta: combinationPriceDelta.value,
  productLabel: props.product.reductionLabel,
}))

const lineTotal = computed(() => effectiveUnitPriceRaw.value * Math.max(1, quantity.value || 0))
const lineTotalFormatted = computed(() => effectiveUnitPriceRaw.value > 0 ? formatEur(lineTotal.value) : priceDisplay.value)

const baseUnitWeight = computed(() => {
  const w = parseFloat(String(props.product.weight ?? ''))
  return !w || Number.isNaN(w) ? 0 : w
})

const effectiveTotalWeight = computed(() => {
  return baseUnitWeight.value * Math.max(1, quantity.value || 0)
})

interface ShippingMethodSummary {
  id: number
  name: string
  delay?: string
  price: number
  priceTTC: number
  isFree?: boolean
  active?: boolean
}

const shippingEstimateMethods = ref<ShippingMethodSummary[]>([])

const langLivraison = typeof useRouteLang === 'function' ? useRouteLang().activeLang : null

async function refreshShippingEstimate() {
  if (effectiveTotalWeight.value <= 0 && lineTotal.value <= 0) return
  try {
    const data = await $fetch<ShippingMethodSummary[]>('/api/shipping/methods', {
      query: {
        lang: langLivraison?.value,
        weight: effectiveTotalWeight.value,
        totalHT: (lineTotal.value || 0) / (1 + (props.product.taxRate ?? 20) / 100),
      },
    })
    if (Array.isArray(data)) {
      shippingEstimateMethods.value = data.filter(m => m.active)
    }
  } catch {
    
  }
}

onMounted(() => {
  refreshShippingEstimate()
})

let shippingTimer: ReturnType<typeof setTimeout> | null = null
watch([effectiveTotalWeight, lineTotal], () => {
  if (shippingTimer) clearTimeout(shippingTimer)
  shippingTimer = setTimeout(refreshShippingEstimate, 150)
})

const shippingEstimateDisplay = computed(() => {
  if (!shippingEstimateMethods.value.length) return ''
  
  const deliveries = shippingEstimateMethods.value.filter(
    m => !m.isFree && m.id !== 2 && !/retrait|pickup|magasin|store/i.test(m.name),
  )
  if (!deliveries.length) {
    const freeDelivery = shippingEstimateMethods.value.find(
      m => m.isFree && m.id !== 2 && !/retrait|pickup|magasin|store/i.test(m.name),
    )
    if (freeDelivery) return t('product.shipping_free', 'Livraison offerte')
    return ''
  }
  const minPrice = Math.min(...deliveries.map(m => isB2b.value ? m.price : m.priceTTC))
  const formatted = formatEur(minPrice)
  const taxSuffix = isB2b.value ? ` ${t('catalogue.label_ht', 'HT')}` : ''
  return t('product.shipping_from', 'Frais de port dès {price}', { price: formatted + taxSuffix })
})

const shippingEstimateTooltip = computed(() => {
  if (!shippingEstimateMethods.value.length) return undefined
  return shippingEstimateMethods.value
    .map(m => {
      const p = m.isFree ? t('checkout.shipping_free', 'Gratuit') : formatEur(isB2b.value ? m.price : m.priceTTC)
      return `${m.name} : ${p}`
    })
    .join(' · ')
})

const weightDisplay = computed(() => {
  const w = effectiveTotalWeight.value
  if (!w || Number.isNaN(w)) return ''
  const wStr = Number.isInteger(w) ? `${w} kg` : `${w.toFixed(2).replace(/\.?0+$/, '')} kg`
  if (shippingEstimateDisplay.value) {
    return `${wStr} · ${shippingEstimateDisplay.value}`
  }
  return wStr
})

const textileConfig = computed<any>(() => (useRuntimeConfig().public as any).textilePersonalization ?? null)
const isTextilePersonalizable = computed<boolean>(() =>
  isSport.value && !!textileConfig.value && (props.product as any).textilePersonalizable === true)
const textileColors = computed<Array<{ label?: string; hex: string }>>(() =>
  Array.isArray(textileConfig.value?.textColors) ? textileConfig.value.textColors : [])
const textileFee = computed<number>(() => Number(textileConfig.value?.fee || 0))
const textileMaxChars = computed<number>(() => Number(textileConfig.value?.maxChars || 20))

const isRacketConfigurable = computed<boolean>(() =>
  isSport.value && !!(useRuntimeConfig().public as any).racketConfigurator && (props.product as any).racketConfigurable === true)
const racketWizardOpen = ref(false)

const personalizing = ref(false)
const personalText = ref('')
const personalColor = ref<string>('')

const personalizationActive = computed<boolean>(() =>
  personalizing.value && personalText.value.trim().length > 0 && !!personalColor.value)
const personalTotalRaw = computed<number>(() =>
  unitPriceRaw.value + (personalizationActive.value ? textileFee.value : 0))
const personalTotalFormatted = computed(() => formatEur(personalTotalRaw.value))
const textileFeeFormatted = computed(() => formatEur(textileFee.value))

function openPersonalizer() {
  personalizing.value = true
  if (!personalColor.value && textileColors.value.length) personalColor.value = textileColors.value[0].hex
}
function resetPersonalizer() {
  personalizing.value = false
  personalText.value = ''
}

interface MarketplaceField { before: string; after: string }
interface MarketplaceCompareResp {
  show: boolean
  original: string | null
  fields?: {
    metaTitle: MarketplaceField
    metaDescription: MarketplaceField
    short: MarketplaceField
    description: MarketplaceField
  }
  llm?: {
    modelLabel: string
    tokensIn: number
    tokensOut: number
    costEur: number
    estimated: boolean
  }
}
const marketplaceCompare = ref<MarketplaceCompareResp | null>(null)
const showMarketplaceCompare = computed(() =>
  marketplaceCompare.value?.show === true && !!marketplaceCompare.value?.original,
)

const marketplaceRows = computed(() => {
  const f = marketplaceCompare.value?.fields
  if (f) {
    return [
      { key: 'metaTitle',       label: t('product.marketplace_field_meta_title', 'Méta-titre'),          html: false, before: f.metaTitle.before,       after: f.metaTitle.after },
      { key: 'metaDescription', label: t('product.marketplace_field_meta_desc', 'Méta-description'),      html: false, before: f.metaDescription.before, after: f.metaDescription.after },
      { key: 'short',           label: t('product.marketplace_field_short', 'Description courte (résumé)'), html: true,  before: f.short.before,          after: f.short.after },
      { key: 'description',     label: t('product.marketplace_field_desc', 'Description longue'),          html: true,  before: f.description.before,    after: f.description.after },
    ]
  }
  return [
    { key: 'description', label: t('product.marketplace_field_desc', 'Description longue'), html: true,
      before: marketplaceCompare.value?.original || '', after: descLong.value || '' },
  ]
})

onMounted(async () => {
  if (partnerReviewsEnabled.value) {
    try {
      const route = typeof useRoute === 'function' ? useRoute() : null
      const pathSeg = typeof route?.path === 'string' ? route.path.split('/')[1] : ''
      const lang = /^[a-z]{2}$/.test(pathSeg) ? pathSeg : (route?.query?.lang as string | undefined)
      partnerReviewsData.value = await $fetch('/api/reviews', { query: { limit: 6, lang } })
    } catch {
      
    }
  }

  if (stickyMobileCartEnabled.value && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    const target = document.getElementById('main-buy-button-container')
    if (target) {
      stickyCartObserver = new IntersectionObserver(([entry]) => {
        const bounding = entry.boundingClientRect
        showStickyMobileCart.value = !entry.isIntersecting && bounding.top < 0
      }, { threshold: 0 })
      stickyCartObserver.observe(target)
    }
  }

  if (!props.product?.id) return
  try {
    marketplaceCompare.value = await $fetch<MarketplaceCompareResp>('/api/marketplace-compare', {
      params: { entity: 'product', id: props.product.id },
    })
  } catch {
    
    marketplaceCompare.value = null
  }
})

onBeforeUnmount(() => {
  stickyCartObserver?.disconnect()
  stickyCartObserver = null
})
</script>

<template>
  <div class="min-h-screen bg-white">
    
    <div class="bg-gray-50 border-b border-gray-100" :class="{ 'sr-only': breadcrumbHidden }">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <nav class="flex items-center gap-2 text-xs text-gray-500">
          <NuxtLink to="/" class="hover:text-primary-600">{{ t('catalogue.breadcrumb_home') }}</NuxtLink>
          <template v-if="breadcrumb?.length && pilier">
            <template v-for="(bc, i) in breadcrumb" :key="i">
              <span>/</span>
              <NuxtLink :to="localePath(`/${pilier}${bc.path ? '/' + bc.path : ''}/`)" class="hover:text-primary-600">
                {{ bc.label }}
              </NuxtLink>
            </template>
          </template>
          <span>/</span>
          <span class="text-gray-700 font-medium">{{ product?.name ?? t('catalogue.product_breadcrumb') }}</span>
        </nav>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      
      <ProductRacketConfigurator
        v-if="isRacketConfigurable && racketWizardOpen"
        :product="product"
        :cart-tenant="cartTenant"
        :unavailable="isOutOfStock"
        @close="racketWizardOpen = false"
        @added="racketWizardOpen = false"
      />
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        <div class="min-w-0">
          <button
            type="button"
            :disabled="!galleryImages.length"
            class="relative group aspect-[4/3] sm:aspect-square w-full bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4 block disabled:cursor-default"
            :class="galleryImages.length ? 'cursor-zoom-in' : ''"
            :aria-label="t('catalogue.image_zoom')"
            @click="openLightbox"
          >
            <img
              v-if="galleryImages.length"
              :src="galleryImages[selectedImage] ?? galleryImages[0]"
              :srcset="selectedSrcset"
              :sizes="selectedSrcset ? MAIN_IMAGE_SIZES : undefined"
              loading="eager"
              fetchpriority="high"
              :alt="product.name"
              class="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-200">
              <svg class="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
            
            <div
              v-if="isTextilePersonalizable && personalizing"
              class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 p-6"
            >
              <div class="relative w-full h-full max-w-[380px] flex items-center justify-center">
                <svg viewBox="0 0 512 512" class="w-full h-full drop-shadow-sm" aria-hidden="true">
                  <path
                    d="M188 54c14 26 42 40 68 40s54-14 68-40l70 34 42 86-58 40-38-28v250c0 14-10 24-24 24H198c-14 0-24-10-24-24V186l-38 28-58-40 42-86 70-34z"
                    fill="#eef0f2" stroke="#d6dade" stroke-width="3"
                  />
                  <path d="M188 54c14 26 42 40 68 40s54-14 68-40" fill="none" stroke="#d6dade" stroke-width="3" />
                </svg>
                <span
                  v-if="personalText.trim()"
                  class="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 px-2 font-extrabold uppercase tracking-wide text-center leading-none break-words max-w-[56%] select-none"
                  :style="{ color: personalColor || '#111827', fontSize: 'clamp(0.95rem, 3vw, 1.9rem)' }"
                >{{ personalText }}</span>
              </div>
            </div>
            <span
              v-if="galleryImages.length"
              class="absolute bottom-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              aria-hidden="true"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M19.5 10.5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3v6m-3-3h6" />
              </svg>
            </span>
          </button>
          <div v-if="galleryImages.length > 1 && !(isTextilePersonalizable && personalizing)" class="flex gap-2 overflow-x-auto p-1 -m-1">
            <button
              v-for="(img, i) in galleryImages"
              :key="i"
              class="shrink-0 w-16 h-16 rounded-lg border overflow-hidden"
              :class="selectedImage === i ? 'border-primary-600 ring-2 ring-primary-600/20' : 'border-gray-200'"
              @click="selectedImage = i"
            >
              <img
                :src="img"
                :srcset="thumbSrcset(i)"
                :sizes="thumbSrcset(i) ? '64px' : undefined"
                loading="lazy"
                decoding="async"
                :alt="`${product.name} - ${i + 1}`"
                class="w-full h-full object-contain p-1"
              />
            </button>
          </div>
        </div>

        
        <div class="min-w-0" :class="productLayoutFlags.purchaseAboveFold ? 'flex flex-col' : ''">
          <h1
            class="text-[22px] sm:text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight mb-2"
            :class="productLayoutFlags.purchaseAboveFold ? 'order-first' : ''"
          >
            {{ product.h1 || product.name }}
            
            <span
              v-if="isOutOfStock"
              class="ml-2 inline-flex items-center gap-1.5 align-middle rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200"
              :title="t('catalogue.out_of_stock_full', 'Produit en rupture de stock')"
            >
              <span class="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              {{ t('catalogue.out_of_stock', 'Rupture') }}
            </span>
          </h1>
          <div
            v-if="productLayoutFlags.wishlistPlacement === 'reference'"
            class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3"
            :class="productLayoutFlags.purchaseAboveFold ? 'order-first' : ''"
            data-test="reference-wishlist-row"
          >
            <p
              v-if="product.reference"
              class="text-[11px] font-medium text-gray-500 uppercase tracking-wider"
            >{{ t('catalogue.label_ref') }} {{ product.reference }}</p>
            <WishlistButton :product-id="product.id" variant="full" />
          </div>
          <p
            v-else-if="product.reference"
            class="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3"
            :class="productLayoutFlags.purchaseAboveFold ? 'order-first' : ''"
          >{{ t('catalogue.label_ref') }} {{ product.reference }}</p>

          
          <div
            v-if="refMatchResult?.matched"
            class="flex items-start sm:items-center gap-3 p-3.5 mb-3 bg-emerald-50/95 border border-emerald-300 rounded-xl text-xs text-emerald-950 shadow-sm"
            data-test="matched-ref-banner"
          >
            <div class="p-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-emerald-900 text-xs sm:text-sm">
                {{ t('product.matched_ref_title', 'Votre référence est 100 % compatible') }} :
                <span class="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800 font-semibold">{{ activeSearchedRef }}</span>
              </p>
              <p class="text-emerald-700 mt-0.5 text-[11px]">
                {{ t('product.matched_ref_subtitle', 'Correspondance validée avec cette pièce ({kind})', { kind: refMatchResult.kindLabel }) }}
              </p>
            </div>
          </div>

          
          <div
            v-if="compatibleVehiclesSummary"
            class="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 mb-3"
          >
            <svg class="w-4 h-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.25 2.25 0 0 0-.659-1.591l-2.56-2.56a2.25 2.25 0 0 0-1.591-.659H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            <div class="truncate">
              <span class="font-semibold text-slate-800">{{ t('product.compatible_with', 'Compatible :') }}</span>
              <span class="ml-1 text-slate-600">{{ compatibleVehiclesSummary }}</span>
            </div>
          </div>

          
          <ProductRating
            v-if="reviewAggregate"
            :rating="reviewAggregate.average"
            :count="reviewAggregate.count"
            size="md"
            class="mb-3"
          />

          
          <div
            v-else-if="partnerReviewsEnabled"
            class="mb-3 inline-flex items-center gap-2 text-xs"
            data-test="partner-reviews-summary"
          >
            <div class="flex items-center text-amber-400" role="img" :aria-label="`${partnerReviewsRating} sur 5`">
              <svg v-for="n in 5" :key="n" class="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <a
              href="#partner-reviews-banner"
              class="font-medium text-slate-700 hover:text-primary-700 hover:underline transition-colors flex items-center gap-1.5"
            >
              <span class="font-bold text-slate-900">{{ partnerReviewsRating }}/5</span>
              <span class="text-slate-400">·</span>
              <span>{{ t('product.partner_reviews_header_label', 'Avis vérifiés / Ateliers partenaires') }}</span>
              <span v-if="partnerReviewsCount" class="text-slate-500 font-normal">({{ partnerReviewsCount }})</span>
            </a>
          </div>

          
          <div v-if="aliasGroups.length" class="mb-4 space-y-2 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl" data-test="alias-groups-section">
            <div
              v-for="g in aliasGroups"
              :key="g.label"
              class="text-[11px] text-gray-500"
            >
              <span class="font-medium text-gray-700 mr-1.5">{{ g.label }} :</span>
              <span class="inline-flex flex-wrap items-center gap-1.5">
                <template v-for="(val, idx) in g.values" :key="val">
                  <span
                    :class="[
                      isAliasHighlighted(val)
                        ? 'font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 ring-1 ring-emerald-300'
                        : 'text-gray-600'
                    ]"
                  >{{ val }}</span>
                  <span v-if="idx < g.values.length - 1" class="text-gray-300 select-none">·</span>
                </template>
              </span>
            </div>

            
            <div class="pt-2 border-t border-slate-200/60">
              <label for="check-my-ref-input" class="block text-[11px] font-medium text-slate-600 mb-1">
                {{ t('product.check_my_ref_label', 'Vérifier le numéro gravé sur votre pièce :') }}
              </label>
              <div class="relative max-w-sm">
                <input
                  id="check-my-ref-input"
                  v-model="manualSearchedRef"
                  type="text"
                  :placeholder="t('product.check_my_ref_placeholder', 'Ex: 0375J6, 9663199280...')"
                  class="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 placeholder-slate-400 font-mono uppercase"
                />
                <button
                  v-if="manualSearchedRef"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                  aria-label="Effacer"
                  @click="manualSearchedRef = ''"
                >×</button>
              </div>
              <p
                v-if="activeSearchedRefNorm.length >= 3 && refMatchResult && !refMatchResult.matched"
                class="text-[11px] text-amber-700 mt-1 font-medium"
                data-test="check-ref-not-found"
              >
                ⚠ {{ t('product.check_my_ref_not_found', 'Référence non répertoriée sur cette pièce') }}
              </p>
            </div>
          </div>
          
          <section
            v-if="fitmentBrands.length"
            class="mb-5 rounded-lg border border-gray-200 bg-white p-3"
            :aria-label="t('product.fitment_title', 'Véhicules compatibles')"
            data-test="fitment-section"
          >
            <h2 class="mb-2 text-sm font-semibold text-gray-800">
              {{ t('product.fitment_title', 'Véhicules compatibles') }}
              <span class="ml-1 text-xs font-normal text-gray-500">
                <template v-if="fitmentSearchQuery.trim()">
                  {{ t('product.fitment_count_filtered', '{filtered} sur {total} motorisations', { filtered: filteredFitmentEngineCount, total: fitmentEngineCount }) }}
                </template>
                <template v-else>
                  {{ t('product.fitment_count', '{n} motorisations').replace('{n}', String(fitmentEngineCount)) }}
                </template>
              </span>
            </h2>

            
            <div v-if="fitmentEngineCount >= 3" class="mb-2.5">
              <div class="relative">
                <input
                  v-model="fitmentSearchQuery"
                  type="search"
                  :placeholder="t('product.fitment_filter_placeholder', 'Filtrer par marque, modèle, moteur (ex: Golf, 1.6 HDi...)')"
                  class="w-full text-xs pl-7 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white text-gray-800 placeholder-gray-400"
                  :aria-label="t('product.fitment_filter_aria', 'Filtrer les véhicules compatibles')"
                  data-test="fitment-search-input"
                />
                <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                </svg>
                <button
                  v-if="fitmentSearchQuery"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                  aria-label="Effacer le filtre"
                  @click="fitmentSearchQuery = ''"
                >×</button>
              </div>
            </div>

            <div class="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
              <div
                v-for="b in filteredFitmentBrands"
                :key="b.brand"
              >
                <p class="font-medium uppercase tracking-wide text-gray-700">
                  {{ b.brand }}
                </p>
                <ul class="ml-3 space-y-0.5">
                  <li
                    v-for="m in b.models"
                    :key="m.model"
                    class="text-gray-600"
                  >
                    <span class="font-medium text-gray-700">{{ m.model }}</span>
                    <span v-if="m.engines.length"> — {{ m.engines.join(' / ') }}</span>
                  </li>
                </ul>
              </div>

              <div v-if="!filteredFitmentBrands.length" class="py-3 text-center text-gray-500" data-test="fitment-no-results">
                <p class="text-xs">{{ t('product.fitment_filter_no_result', 'Aucun véhicule correspondant à votre recherche') }}</p>
                <button
                  type="button"
                  class="text-xs text-primary-600 hover:underline mt-1 font-medium"
                  @click="fitmentSearchQuery = ''"
                >
                  {{ t('product.fitment_filter_reset', 'Effacer le filtre') }}
                </button>
              </div>
            </div>
          </section>
          <div v-if="productLayoutFlags.wishlistPlacement !== 'reference'" class="mb-5">
            <WishlistButton :product-id="product.id" variant="full" />
          </div>

          
          <div v-if="isSport && sportChips.length" class="flex flex-wrap gap-1.5 mb-5">
            <span
              v-for="(chip, i) in sportChips"
              :key="i"
              class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-700"
            >{{ chip }}</span>
          </div>

          
          <div
            class="bg-gray-50 rounded-xl p-5 mb-6"
            :class="productLayoutFlags.purchaseAboveFold ? 'order-[-2]' : ''"
          >
            <ClientOnly>
              <template v-if="showPrices">
                
                <template v-if="product.pricePerKgFormatted || unitPriceDisplay">
                  <div class="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <p class="text-3xl font-extrabold text-primary-600">
                      {{ product.pricePerKgFormatted ? product.pricePerKgFormatted : `${unitPriceDisplay.replace(' €/kg', '')} €` }}
                      <span class="text-base font-bold text-primary-600">{{ product.unitLabel || 'HT/K' }}</span>
                    </p>
                    <span
                      v-if="product.pricePerKgFormattedBeforeDiscount"
                      class="text-base text-red-600 line-through"
                    >{{ product.pricePerKgFormattedBeforeDiscount }}</span>
                    <span
                      v-if="product.reductionLabel"
                      class="text-xs font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ product.reductionLabel }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    <template v-if="product.taxRate">TVA à {{ product.taxRate.toString().replace('.', ',') }} %, soit pour {{ quantity === 1 ? 'un colis' : `${quantity} colis` }} :</template>
                    <span class="font-semibold text-gray-900">{{ lineTotalFormatted }} HT</span>
                    <span
                      v-if="strikePrice && quantity === 1"
                      class="ml-1 text-red-600 line-through"
                    >{{ formatEur(strikePrice.raw) }}</span>
                  </p>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <p v-if="quantity > 1 && unitPriceRaw > 0" class="text-xs text-gray-500">
                      {{ quantity }} × {{ priceDisplay }}
                    </p>
                    <p v-if="weightDisplay" class="text-xs text-gray-500" :title="shippingEstimateTooltip">{{ t('catalogue.product_weight') }} {{ weightDisplay }}</p>
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <p class="text-3xl font-extrabold text-primary-600">
                      {{ lineTotalFormatted }}
                      <span v-if="isB2b" class="text-sm font-normal text-gray-400">{{ t('catalogue.label_ht') }}</span>
                    </p>
                    <span
                      v-if="strikePrice && quantity === 1"
                      class="text-base text-red-600 line-through"
                    >{{ formatEur(strikePrice.raw) }}</span>
                    <span
                      v-if="strikePrice?.label"
                      class="text-xs font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ strikePrice.label }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <p v-if="quantity > 1 && effectiveUnitPriceRaw > 0" class="text-xs font-medium text-gray-600">
                      {{ t('product.total_breakdown', 'Soit {unit} / pièce pour {qty} pièces', { unit: priceDisplay, qty: quantity }) }}
                    </p>
                    <p v-if="weightDisplay" class="text-xs text-gray-500" :title="shippingEstimateTooltip">{{ t('catalogue.product_weight') }} {{ weightDisplay }}</p>
                  </div>
                </template>
              </template>
              <div v-else class="text-center py-2">
                <p class="text-sm text-gray-500">
                  {{ t('catalogue.price_pro_only') }}
                  <NuxtLink :to="localePath('/inscription')" class="text-primary-600 hover:underline ml-1">
                    {{ t('auth.login_create_account') }}
                  </NuxtLink>
                </p>
              </div>
              <template #fallback>
                <div class="h-8 w-40 rounded bg-slate-200 animate-pulse" />
                <div class="h-3 w-64 rounded bg-slate-100 animate-pulse mt-2" />
              </template>
            </ClientOnly>
          </div>

          
          <ProductQuantityBreaks
            v-bind="productLayoutFlags.purchaseAboveFold ? { class: 'order-[-2]' } : {}"
            :breaks="effectiveQuantityBreaks"
            :unit-label="product.unitLabel"
            @select-quantity="(q) => quantity = q"
          />

          
          <HookSlot name="displayProductAfterPrice" :context="product" />

          
          <ProductClickCollect
            v-if="isSport && showClickCollect"
            :product-id="product.id"
            :combination-id="selectedCombinationId"
          />

          <div
            v-if="calibrageFeature"
            class="flex items-center gap-3 mb-6 p-3 border border-primary-600/20 bg-primary-600/5 rounded-xl"
          >
            <span class="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{{ calibrageFeature.name }}</span>
            <span class="text-sm font-bold text-gray-900">{{ calibrageFeature.value }}</span>
          </div>

          
          <div v-if="product.spec" class="flex flex-wrap gap-2 mb-6">
            <div v-if="product.spec.countryOrigin" class="flex items-center gap-2 px-3 py-1.5 bg-primary-600/5 border border-primary-600/20 rounded-lg">
              <svg class="w-3.5 h-3.5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ t('product.origin') }}</span>
              <span class="text-xs font-semibold text-gray-900">{{ product.spec.countryOrigin }}</span>
            </div>
            <div v-if="product.spec.shelfLifeMonths" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <svg class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ t('product.shelf_life') }}</span>
              <span class="text-xs font-semibold text-gray-900">{{ product.spec.shelfLifeMonths }} {{ t('product.months') }}</span>
            </div>
            <div v-if="product.spec.pack?.gencod" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <svg class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.5v15m3-15v15m3-15v15m3-15v15m3-15v15m3-15v15M4.5 4.5h15M4.5 19.5h15"/></svg>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ t('product.ean13') }}</span>
              <span class="text-xs font-mono font-semibold text-gray-900">{{ product.spec.pack.gencod }}</span>
            </div>
          </div>

          
          <div
            v-for="group in attributeGroups"
            :key="group.id"
            class="mb-5"
            :class="productLayoutFlags.purchaseAboveFold && isDepositGroup(group) ? 'order-[-3]' : ''"
          >
            <p class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{{ group.name }}</p>
            <div class="flex flex-wrap gap-2">
              <template v-for="v in group.values" :key="v.id">
                
                <button
                  v-if="group.isColorGroup && v.color"
                  type="button"
                  :aria-pressed="v.combinationId === selectedCombinationId"
                  @click="selectedCombinationId = v.combinationId"
                  :disabled="v.quantity <= 0"
                  :aria-label="v.value + (v.quantity <= 0 ? ' — ' + t('product.out_of_stock') : '')"
                  :class="[
                    'h-9 w-9 rounded-full border-2 transition-all',
                    v.combinationId === selectedCombinationId
                      ? 'border-primary-600 ring-2 ring-primary-200 scale-110'
                      : v.quantity <= 0
                        ? 'border-gray-200 cursor-not-allowed opacity-40'
                        : 'border-gray-300 hover:border-primary-400',
                  ]"
                  :style="{ backgroundColor: v.color }"
                  :title="v.value + (v.quantity <= 0 ? ' — ' + t('product.out_of_stock') : ` — ${v.quantity} ${t('product.in_stock_short')}`)"
                />
                
                <button
                  v-else
                  type="button"
                  :aria-pressed="v.combinationId === selectedCombinationId"
                  @click="selectedCombinationId = v.combinationId"
                  :disabled="v.quantity <= 0"
                  :class="[
                    'h-10 min-w-[3rem] px-3 rounded-lg border text-sm font-semibold transition-all',
                    v.combinationId === selectedCombinationId
                      ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                      : v.quantity <= 0
                        ? 'border-gray-200 text-gray-300 line-through cursor-not-allowed bg-gray-50'
                        : 'border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600',
                  ]"
                  :title="v.quantity <= 0 ? t('product.out_of_stock') : `${v.quantity} ${t('product.in_stock_short')}`"
                >{{ v.value }}</button>
              </template>
            </div>
            <p v-if="selectedCombination" class="text-xs text-gray-500 mt-2">
              <span v-if="selectedStock > 5" class="text-emerald-700 font-medium">● {{ t('product.in_stock') }}</span>
              <span v-else-if="selectedStock > 0" class="text-amber-600 font-medium">● {{ t('product.low_stock') }} — {{ selectedStock }} {{ t('product.in_stock_short') }}</span>
              <span v-else class="text-red-600 font-medium">● {{ t('product.out_of_stock') }}</span>
            </p>

            
            <div v-if="sameDayEnabled && selectedStock > 0" class="mt-2.5">
              <ProductShippingCountdown
                :cutoff-hour="sameDayCutoffHour"
                :timezone="sameDayTimezone"
                :available="selectedStock > 0"
              />
            </div>

            
            <div
              v-if="isDepositGroup(group)"
              class="mt-3 p-3.5 bg-primary-50/60 border border-primary-200/80 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1.5"
            >
              <div class="flex items-center gap-2 font-semibold text-primary-900">
                <svg v-if="isDepositPaidSelected" class="w-4 h-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <svg v-else class="w-4 h-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                <span>
                  {{ isDepositPaidSelected
                    ? t('product.deposit_paid_badge', 'Expédition immédiate sous 24/48 h')
                    : t('product.deposit_core_first_badge', 'Envoi de votre ancienne matière d\'abord')
                  }}
                </span>
              </div>
              <p class="text-slate-600">
                {{ isDepositPaidSelected
                  ? t('product.deposit_paid_help', 'Expédition immédiate sous 24/48 h. La caution vous sera intégralement remboursée à réception de votre ancienne pièce.')
                  : t('product.deposit_core_first_help', 'Aucune caution à avancer. Votre nouvelle pièce sera expédiée dès réception de votre ancienne pièce dans nos ateliers.')
                }}
              </p>
              <div class="pt-0.5">
                <NuxtLink :to="localePath('/consigne')" class="inline-flex items-center gap-1 font-medium text-primary-700 hover:text-primary-800 hover:underline">
                  <span>{{ t('product.deposit_learn_more', 'Comment fonctionne l\'échange standard et la consigne ?') }}</span>
                  <span aria-hidden="true">→</span>
                </NuxtLink>
              </div>
            </div>
          </div>

          
          <div v-if="isTextilePersonalizable" class="mb-6">
            <button
              v-if="!personalizing"
              type="button"
              class="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
              @click="openPersonalizer"
            >
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
              {{ t('product.personalize_textile_cta', 'Personnaliser le textile') }}
            </button>

            <div v-else class="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-xs font-bold uppercase tracking-widest text-gray-500">
                  {{ t('product.personalize_textile_heading', 'Personnalisation du textile') }}
                </h2>
                <button type="button" class="text-xs font-semibold text-gray-400 hover:text-gray-700" @click="resetPersonalizer">
                  {{ t('common.cancel', 'Annuler') }}
                </button>
              </div>

              <label class="block text-sm font-medium text-gray-700 mb-1" for="textile-perso-text">
                {{ t('product.personalize_text_label', 'Votre texte') }}
              </label>
              <input
                id="textile-perso-text"
                v-model="personalText"
                type="text"
                :maxlength="textileMaxChars"
                :placeholder="t('product.personalize_text_placeholder', 'Ex : votre nom, votre club…')"
                class="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
              <p class="text-[11px] text-gray-400 mt-1 text-right">{{ personalText.length }}/{{ textileMaxChars }}</p>

              <template v-if="textileColors.length">
                <p class="text-sm font-medium text-gray-700 mb-1.5 mt-2">{{ t('product.personalize_color_label', 'Couleur du texte') }}</p>
                <div class="flex items-center gap-2">
                  <button
                    v-for="c in textileColors"
                    :key="c.hex"
                    type="button"
                    :title="c.label || c.hex"
                    :aria-label="c.label || c.hex"
                    :aria-pressed="personalColor === c.hex"
                    class="w-8 h-8 rounded-full border transition-all"
                    :class="personalColor === c.hex ? 'ring-2 ring-primary-500 ring-offset-2 border-primary-500' : 'border-gray-300 hover:border-gray-400'"
                    :style="{ backgroundColor: c.hex }"
                    @click="personalColor = c.hex"
                  />
                </div>
              </template>

              <div v-if="personalizationActive" class="mt-4 pt-3 border-t border-gray-200">
                <p class="text-sm text-primary-600 font-medium">
                  + {{ textileFeeFormatted }} · {{ t('product.personalize_fee_label', 'Personnalisation du textile') }}
                </p>
                <p class="text-lg font-extrabold text-gray-900 mt-1">
                  {{ t('product.personalize_total_label', 'Total') }} : {{ personalTotalFormatted }}
                </p>
              </div>
            </div>
          </div>

          
          <button
            v-if="isRacketConfigurable && !racketWizardOpen"
            type="button"
            :disabled="isOutOfStock"
            class="w-full mb-6 inline-flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-primary-600 text-primary-600 hover:bg-primary-50 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            @click="racketWizardOpen = true"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
            {{ t('product.racket_configure_cta', 'Personnaliser ma raquette — cordage & accessoires') }}
          </button>

          
          <div
            v-if="sameDayEnabled && !hasCombinations && !isOutOfStock"
            class="mb-4"
            :class="productLayoutFlags.purchaseAboveFold ? 'order-[-1]' : ''"
          >
            <ProductShippingCountdown
              :cutoff-hour="sameDayCutoffHour"
              :timezone="sameDayTimezone"
              :available="!isOutOfStock"
            />
          </div>

          <div
            id="main-buy-button-container"
            class="flex flex-wrap items-center gap-3 sm:gap-4 mb-6"
            :class="productLayoutFlags.purchaseAboveFold ? 'order-[-1]' : ''"
          >
            <div class="flex items-center border border-gray-200 rounded-lg">
              <button class="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900" :aria-label="t('product.quantity_decrease')" @click="decrement">−</button>
              <input v-model.number="quantity" type="number" min="1" :aria-label="t('product.quantity')" class="w-14 h-10 text-center text-sm font-semibold border-x border-gray-200 focus:outline-none" />
              <button class="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900" :aria-label="t('product.quantity_increase')" @click="increment">+</button>
            </div>
            <ClientOnly>
              <button
                v-if="showPrices"
                class="flex-1 min-w-0 h-12 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap px-4"
                :class="addedToCart ? 'bg-emerald-500 text-white' : isOutOfStock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                :disabled="isOutOfStock"
                @click="addToCart"
              >
                {{ isOutOfStock ? t('product.out_of_stock') : addedToCart ? t('catalogue.added_to_cart') : t('catalogue.add_to_cart') }}
              </button>
              <button
                v-else
                class="flex-1 min-w-0 h-12 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap px-4"
                :class="addedToQuote ? 'bg-emerald-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                @click="addProductToQuote"
              >
                {{ addedToQuote ? t('catalogue.added_to_quote') : t('catalogue.add_to_quote') }}
              </button>
              <template #fallback>
                <div class="flex-1 min-w-0 h-12 rounded-xl bg-slate-100 animate-pulse" />
              </template>
            </ClientOnly>
            <ChatbotProductButton :product-id="product.id" :qty="quantity" variant="detail" class="w-full sm:flex-1 min-w-0 h-12 rounded-xl whitespace-nowrap px-4" />
          </div>

          <ClientOnly>
            <NuxtLink
              v-if="showPrices && totalItems > 0"
              :to="localePath('/panier')"
              class="block text-center text-xs text-primary-600 hover:underline mb-4"
            >
              {{ t('catalogue.product_view_cart') }} ({{ totalItems }} {{ totalItems > 1 ? t('cart.articles') : t('cart.article') }})
            </NuxtLink>
            <NuxtLink
              v-if="!showPrices && quoteTotalItems > 0"
              :to="localePath('/devis')"
              class="block text-center text-xs text-primary-600 hover:underline mb-4"
            >
              {{ t('catalogue.product_view_quote') }} ({{ quoteTotalItems }} {{ quoteTotalItems > 1 ? t('cart.articles') : t('cart.article') }})
            </NuxtLink>
          </ClientOnly>

          
          <ClientOnly>
            <div
              v-if="isOutOfStock"
              class="mt-2 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <p class="text-sm font-semibold text-amber-800 mb-3">
                <svg class="inline w-4 h-4 mr-1.5 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {{ t('product.notify_back_in_stock') }}
              </p>
              <form v-if="notifyStatus !== 'ok'" class="flex gap-2" @submit.prevent="submitStockAlert">
                <input
                  v-model="notifyEmail"
                  type="email"
                  required
                  :placeholder="t('product.notify_email_placeholder')"
                  class="flex-1 h-10 px-3 rounded-lg border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <button
                  type="submit"
                  :disabled="notifyLoading"
                  class="h-10 px-4 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {{ notifyLoading ? '…' : t('product.notify_submit') }}
                </button>
              </form>
              <p v-if="notifyStatus === 'ok'" class="text-sm text-emerald-700 font-medium">
                ✓ {{ t('product.notify_success') }}
              </p>
              <p v-if="notifyStatus === 'duplicate'" class="mt-2 text-xs text-amber-700">
                {{ t('product.notify_already_registered') }}
              </p>
              <p v-if="notifyStatus === 'error'" class="mt-2 text-xs text-red-600">
                {{ t('product.notify_error') }}
              </p>
            </div>
          </ClientOnly>

          
          <section v-if="product.accessories?.length" class="mb-6 border-t border-gray-200 pt-6">
            <h2 class="text-sm font-bold text-gray-900 mb-4">
              {{ t('product.related_title') }}
              <span v-if="product.accessories.length > 3" class="ml-1 text-[10px] font-normal text-gray-400">({{ product.accessories.length }})</span>
            </h2>
            <div
              :class="product.accessories.length > 3
                ? 'space-y-3 max-h-[312px] overflow-y-auto pr-1 scroll-smooth [scrollbar-width:thin]'
                : 'space-y-3'"
            >
              <div
                v-for="acc in product.accessories"
                :key="acc.id"
                class="group flex items-stretch gap-3 rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-primary-500 hover:shadow-md transition"
              >
                <NuxtLink :to="acc.url" class="shrink-0 w-24 h-24 bg-gray-50 overflow-hidden">
                  <img
                    v-if="acc.image"
                    :src="acc.image"
                    :alt="acc.name"
                    width="200"
                    height="200"
                    loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                </NuxtLink>
                <div class="flex-1 min-w-0 flex flex-col justify-between py-2 pr-2">
                  <NuxtLink :to="acc.url" class="block">
                    <h3 class="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-primary-700">{{ acc.name }}</h3>
                    <ClientOnly>
                      <p v-if="showPrices && acc.priceFormatted" class="mt-0.5 text-xs font-semibold text-gray-900">{{ acc.priceFormatted }}</p>
                    </ClientOnly>
                  </NuxtLink>
                  <div class="flex items-stretch gap-1 mt-2">
                    <div class="flex items-center border border-gray-200 rounded-md overflow-hidden">
                      <button
                        type="button"
                        class="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 text-sm"
                        :aria-label="t('catalogue.qty_decrease')"
                        @click="setAccessoryQty(acc.id, getAccessoryQty(acc.id) - 1)"
                      >−</button>
                      <input
                        :value="getAccessoryQty(acc.id)"
                        type="number"
                        min="1"
                        :aria-label="t('product.quantity')"
                        class="w-9 h-8 text-center text-xs font-semibold border-x border-gray-200 focus:outline-none"
                        @input="(e) => setAccessoryQty(acc.id, Number((e.target as HTMLInputElement).value))"
                      />
                      <button
                        type="button"
                        class="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 text-sm"
                        :aria-label="t('catalogue.qty_increase')"
                        @click="setAccessoryQty(acc.id, getAccessoryQty(acc.id) + 1)"
                      >+</button>
                    </div>
                    <button
                      type="button"
                      class="flex-1 h-8 rounded-md text-xs font-semibold whitespace-nowrap px-2 transition-colors border"
                      :class="accessoryAdded[acc.id]
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-primary-600 text-primary-700 hover:bg-primary-50'"
                      @click="addAccessoryToCartOrQuote(acc)"
                    >
                      <template v-if="accessoryAdded[acc.id]">{{ t('catalogue.added_short') }}</template>
                      <ClientOnly v-else>
                        <template v-if="showPrices">{{ t('catalogue.add_short') }}</template>
                        <template v-else>{{ t('catalogue.quote_short') }}</template>
                        <template #fallback>{{ t('catalogue.add_short') }}</template>
                      </ClientOnly>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          
          <div
            v-if="descShort"
            class="prose prose-sm max-w-none text-gray-700 mb-6"
            v-html="descShort"
          />
          <div
            v-else-if="descLong"
            class="prose prose-sm max-w-none text-gray-700 mb-6"
            v-html="descLong"
          />

          
          <div
            v-if="partnerReviewsEnabled"
            id="partner-reviews-banner"
            class="mb-6 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white p-4.5 sm:p-5 shadow-xs"
            data-test="partner-reviews-banner"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 border border-emerald-200/80">
                  <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {{ t('product.partner_reviews_badge', 'Avis vérifiés') }}
                </span>
                <span class="text-xs font-bold text-slate-800">
                  {{ t('product.partner_reviews_title', 'Ateliers partenaires') }}
                </span>
              </div>
              <div class="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                <div class="flex text-amber-400" aria-hidden="true">
                  <svg v-for="n in 5" :key="n" class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span class="text-xs font-extrabold text-slate-900 tracking-tight">{{ partnerReviewsRating }}/5</span>
              </div>
            </div>

            
            <div class="mt-3 pt-3 border-t border-emerald-100/80">
              <p class="text-xs text-slate-700 italic leading-relaxed">
                « {{ partnerReviewQuote.text }} »
              </p>
              <div class="mt-2 flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  {{ partnerReviewQuote.author }}
                </span>
                <NuxtLink
                  :to="localePath('/avis/')"
                  class="font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 text-xs"
                >
                  <span>{{ t('product.partner_reviews_cta', 'Voir tous les avis') }}</span>
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </NuxtLink>
              </div>
            </div>
          </div>

          <div v-if="reassuranceItems" class="grid grid-cols-2 gap-3">
            <div
              v-for="(item, i) in reassuranceItems"
              :key="i"
              class="flex items-center gap-3 text-xs text-gray-500"
            >
              <svg class="w-5 h-5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" :d="reassuranceIconPath(item.icon)" /></svg>
              {{ t(item.key, item.fallback) }}
            </div>
          </div>
          <div v-else class="grid grid-cols-2 gap-3">
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.25 2.25 0 0 0-.659-1.591l-2.56-2.56a2.25 2.25 0 0 0-1.591-.659H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                {{ t('catalogue.free_shipping') }}
              </div>
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                {{ t('catalogue.secure_payment') }}
              </div>
              <div v-if="showClickCollect" class="flex items-center gap-3 text-xs text-gray-500">
                <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>
                {{ t('catalogue.drive_collect') }}
              </div>
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                {{ t('catalogue.quality_premium') }}
              </div>
          </div>
        </div>
      </div>

      
      <section
        v-if="hasDeposit"
        class="mt-12 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white p-6 sm:p-8"
        aria-labelledby="exchange-guide-heading"
      >
        <div class="max-w-3xl mx-auto text-center mb-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-3">
            <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>{{ t('product.exchange_guide_badge', 'Procédé Échange Standard') }}</span>
          </div>
          <h2 id="exchange-guide-heading" class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {{ t('product.exchange_guide_title', 'Comment fonctionne l\'échange standard en 3 étapes ?') }}
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          <div class="relative bg-white rounded-xl border border-slate-200/70 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center ring-4 ring-primary-50">1</span>
                <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-900 mb-2">
                {{ t('product.exchange_step_1_title', '1. Commande') }}
              </h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                {{ t('product.exchange_step_1_desc', 'Commandez votre pièce reconditionnée avec ou sans avance de caution selon l\'option choisie.') }}
              </p>
            </div>
          </div>

          
          <div class="relative bg-white rounded-xl border border-slate-200/70 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center ring-4 ring-primary-50">2</span>
                <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.32l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.32 4.486c.048.58.024 1.193-.14 1.743" />
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-900 mb-2">
                {{ t('product.exchange_step_2_title', '2. Montage & Réutilisation') }}
              </h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                {{ t('product.exchange_step_2_desc', 'Réceptionnez votre pièce, montez-la sur le véhicule et replacez l\'ancienne matière dans le même carton protecteur.') }}
              </p>
            </div>
          </div>

          
          <div class="relative bg-white rounded-xl border border-slate-200/70 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center ring-4 ring-primary-50">3</span>
                <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <h3 class="text-sm font-bold text-slate-900 mb-2">
                {{ t('product.exchange_step_3_title', '3. Retour & Remboursement') }}
              </h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                {{ t('product.exchange_step_3_desc', 'Déposez le colis de retour. Dès contrôle de votre vieille matière, votre caution est débloquée ou remboursée sous 48 h.') }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-8 text-center">
          <NuxtLink
            :to="localePath('/consigne')"
            class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary-700 hover:text-primary-800 hover:underline"
          >
            <span>{{ t('product.deposit_learn_more', 'Comment fonctionne l\'échange standard et la consigne ?') }}</span>
            <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </section>

      
      <div v-if="hasLongDescription" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('catalogue.description') }}</h2>
        <div
          class="prose prose-sm sm:prose-base max-w-none text-gray-600
                 prose-headings:text-gray-900 prose-headings:font-bold
                 prose-p:my-3 prose-p:leading-relaxed
                 prose-p:first:text-base prose-p:first:sm:text-[17px] prose-p:first:font-medium prose-p:first:text-gray-900 prose-p:first:leading-relaxed prose-p:first:mt-0 prose-p:first:mb-4
                 prose-ul:my-4 prose-ul:pl-5 prose-li:my-1.5 prose-li:marker:text-primary-600
                 prose-strong:text-gray-900 prose-strong:font-semibold
                 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
          v-html="descLong"
        />
      </div>

      
      <section v-if="isSport && product.highlights?.length" class="mt-12 pt-8 border-t border-gray-100">
        <div class="grid sm:grid-cols-3 gap-6">
          <div v-for="(h, i) in product.highlights" :key="i" class="flex flex-col">
            <div v-if="h.imageUrl" class="aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-50 mb-4">
              <img :src="h.imageUrl" :alt="h.title || ''" loading="lazy" class="w-full h-full object-cover" />
            </div>
            <h3 v-if="h.title" class="text-sm font-bold text-gray-900 mb-1.5">{{ h.title }}</h3>
            <p v-if="h.text" class="text-sm text-gray-600 leading-relaxed">{{ h.text }}</p>
          </div>
        </div>
      </section>

      
      <div v-if="showMarketplaceCompare" class="mt-8 pt-8 border-t-2 border-dashed border-amber-300">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wide">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            </svg>
            {{ t('product.marketplace_compare_badge', 'Aperçu employé') }}
          </span>
          <p class="text-xs text-gray-400">
            {{ t('product.marketplace_compare_hint', 'Visible uniquement par vous (employé connecté) — jamais par un client.') }}
          </p>
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-2">{{ t('product.marketplace_compare_title', 'Comparaison marketplace') }}</h2>

        
        <div v-if="marketplaceCompare?.llm" class="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>{{ t('product.marketplace_llm_model', 'Modèle') }} : <strong class="text-gray-700">{{ marketplaceCompare.llm.modelLabel }}</strong></span>
          <span>{{ t('product.marketplace_llm_tokens', 'Tokens') }} : ~{{ (marketplaceCompare.llm.tokensIn + marketplaceCompare.llm.tokensOut).toLocaleString('fr-FR') }}
            <span class="text-gray-400">({{ marketplaceCompare.llm.tokensIn.toLocaleString('fr-FR') }} entrée / {{ marketplaceCompare.llm.tokensOut.toLocaleString('fr-FR') }} sortie)</span></span>
          <span>{{ t('product.marketplace_llm_cost', 'Coût') }} : <strong class="text-gray-700">≈ {{ marketplaceCompare.llm.costEur.toFixed(5) }} €</strong>
            <span v-if="marketplaceCompare.llm.estimated" class="text-gray-400">({{ t('product.marketplace_llm_estimated', 'estimation') }})</span></span>
        </div>

        
        <div class="space-y-6">
          <div v-for="row in marketplaceRows" :key="row.key">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{{ row.label }}</h3>
            <div class="grid md:grid-cols-2 gap-4">
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {{ t('product.marketplace_compare_original', "Version d'origine (fournisseur)") }}
                </div>
                <div v-if="row.html" class="prose prose-sm max-w-none text-gray-600" v-html="row.before || '—'" />
                <p v-else class="text-sm text-gray-600 whitespace-pre-wrap">{{ row.before || '—' }}</p>
              </div>
              <div class="rounded-xl border border-primary-200 bg-primary-600/5 p-4">
                <div class="text-[10px] font-bold uppercase tracking-wider text-primary-700 mb-2">
                  {{ t('product.marketplace_compare_rewritten', 'Version réécrite (en ligne)') }}
                </div>
                <div v-if="row.html" class="prose prose-sm max-w-none text-gray-700" v-html="row.after || '—'" />
                <p v-else class="text-sm text-gray-800 whitespace-pre-wrap">{{ row.after || '—' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div v-if="product.attachments?.length" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('catalogue.datasheets') }}</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          <a
            v-for="att in product.attachments"
            :key="att.id"
            :href="`/api/catalogue/product/attachment/${att.id}?clientId=${clientId}`"
            target="_blank"
            class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-600 hover:bg-primary-600/5 transition-colors group"
          >
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              :class="att.mime?.includes('pdf') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'"
            >
              <svg v-if="att.mime?.includes('pdf')" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5a.5.5 0 0 1-1 0V13a.5.5 0 0 1 .5-.5h1zm4 0h1.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5H12a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5zm.5 1v2h.5v-2H13zm-7.5 0H6a.5.5 0 0 1 0 1h-.5v.5a.5.5 0 0 1 0 1h.5v1a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5z"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 group-hover:text-primary-600 truncate">{{ att.name }}</p>
              <p class="text-xs text-gray-400">
                {{ att.mime?.includes('pdf') ? 'PDF' : att.mime?.includes('spreadsheet') ? 'Excel' : att.fileName?.split('.').pop()?.toUpperCase() }}
                <span v-if="att.fileSize"> · {{ (att.fileSize / 1024).toFixed(0) }} Ko</span>
              </p>
            </div>
            <svg class="w-4 h-4 text-gray-300 group-hover:text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </a>
        </div>
      </div>

      
      <div v-if="otherFeatures.length" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('catalogue.features') }}</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div
            v-for="f in otherFeatures"
            :key="f.id ?? f.name"
            class="flex items-baseline justify-between gap-4 py-2 border-b border-gray-50"
          >
            <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500">{{ f.name }}</dt>
            <dd class="text-sm font-medium text-gray-900 text-right">{{ f.displayValue }}</dd>
          </div>
        </dl>
      </div>

      
      <div v-if="hasSpecContent" class="mt-12 pt-8 border-t border-gray-100 space-y-10">
        <h2 class="text-xl font-bold text-gray-900">{{ t('product.specs_heading') }}</h2>

        <div class="grid md:grid-cols-2 gap-8">
          <div v-if="product.spec.ingredients?.length">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.ingredients') }}</h3>
            <ul class="space-y-2">
              <li
                v-for="(ing, i) in product.spec.ingredients"
                :key="i"
                class="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 text-sm"
              >
                <span class="text-gray-900">
                  {{ ing.name }}
                  <span v-if="ing.origin" class="text-[10px] text-gray-400 ml-1">({{ ing.origin }})</span>
                </span>
                <span v-if="ing.pct != null" class="text-gray-500 font-mono text-xs shrink-0">{{ ing.pct }}%</span>
              </li>
            </ul>
          </div>

          <div v-if="product.spec.nutri?.energyKcal != null">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.nutri_heading') }} <span class="text-[10px] text-gray-300">{{ t('product.nutri_per_100g') }}</span></h3>
            <dl class="space-y-1.5 text-sm">
              <div v-if="product.spec.nutri.energyKj" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_energy') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.energyKj }} Kj / {{ product.spec.nutri.energyKcal }} Kcal</dd>
              </div>
              <div v-if="product.spec.nutri.fatG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_fat') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.fatG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.satFatG != null" class="flex justify-between py-1 border-b border-gray-50 pl-3 text-xs text-gray-500">
                <dt>{{ t('product.nutri_satfat') }}</dt>
                <dd>{{ product.spec.nutri.satFatG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.carbsG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_carbs') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.carbsG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.sugarsG != null" class="flex justify-between py-1 border-b border-gray-50 pl-3 text-xs text-gray-500">
                <dt>{{ t('product.nutri_sugars') }}</dt>
                <dd>{{ product.spec.nutri.sugarsG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.proteinsG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_proteins') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.proteinsG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.saltG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_salt') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.saltG }} g</dd>
              </div>
            </dl>
          </div>
        </div>

        <div v-if="product.spec.allergens?.length">
          <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.allergens') }} <span class="text-[10px] text-gray-300">{{ t('product.allergens_inco') }}</span></h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="a in product.spec.allergens"
              :key="a"
              class="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800"
            >
              {{ a }}
            </span>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <div v-if="product.spec.pack?.unitsPerCarton">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.pack_heading') }}</h3>
            <dl class="space-y-1.5 text-sm">
              <div v-if="product.spec.pack.container" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_container') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.container }}</dd>
              </div>
              <div v-if="product.spec.pack.unitWeight" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_unit_weight') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.unitWeight }}</dd>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_units_per_carton') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.unitsPerCarton }}</dd>
              </div>
              <div v-if="product.spec.pack.cartonWeight" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_carton_weight') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.cartonWeight }}</dd>
              </div>
              <div v-if="product.spec.pack.cartonsPerPallet" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_cartons_per_pallet') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.cartonsPerPallet }}</dd>
              </div>
              <div v-if="product.spec.pack.material" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_material') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.material }}</dd>
              </div>
            </dl>
          </div>

          <div v-if="product.spec.compliance">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.compliance_heading') }}</h3>
            <div class="flex flex-wrap gap-2">
              <span v-if="product.spec.compliance.isNonGmo === true" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.42 0l-4-4a1 1 0 1 1 1.42-1.42L8 12.59l7.29-7.29a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>
                {{ t('product.compliance_non_gmo') }}
              </span>
              <span v-if="product.spec.compliance.isIonised === false" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.42 0l-4-4a1 1 0 1 1 1.42-1.42L8 12.59l7.29-7.29a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>
                {{ t('product.compliance_non_ionised') }}
              </span>
              <span v-if="product.spec.compliance.hasNanomaterials === false" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.42 0l-4-4a1 1 0 1 1 1.42-1.42L8 12.59l7.29-7.29a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>
                {{ t('product.compliance_no_nano') }}
              </span>
            </div>
            <div v-if="product.spec.processProduction" class="mt-4 text-xs text-gray-500 leading-relaxed">
              <span class="font-semibold text-gray-600">{{ t('product.process') }} :</span> {{ product.spec.processProduction }}
            </div>
            <div v-if="product.spec.storageTemperature" class="mt-2 text-xs text-gray-500">
              <span class="font-semibold text-gray-600">{{ t('product.storage') }} :</span>
              {{ product.spec.storageTemperature }}
              <span v-if="product.spec.storageHumidity"> · {{ t('product.humidity') }} {{ product.spec.storageHumidity }}</span>
            </div>
          </div>
        </div>
      </div>

      
      <section v-if="product.faq && product.faq.length" id="faq" class="mt-8">
        <CategoryFaq :items="product.faq" />
      </section>

      
      <section v-if="product.related?.length" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('product.related_carousel_title', 'Ces articles devraient vous plaire') }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <ProductCard v-for="item in product.related" :key="item.id" :product="item" />
        </div>
      </section>

    </div>

    
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="lightboxOpen && galleryImages.length"
          class="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 px-4 py-6 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          @click="lightboxOpen = false"
          @keydown.esc="lightboxOpen = false"
        >
          <img
            :src="zoomImage || galleryImages[selectedImage] || galleryImages[0]"
            :alt="product.name"
            class="max-w-[95vw] max-h-[90vh] object-contain"
            @click.stop
          />
          <button
            type="button"
            class="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-lg"
            :aria-label="t('catalogue.image_close')"
            @click.stop="lightboxOpen = false"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>

    
    <div
      v-if="stickyMobileCartEnabled"
      id="sticky-mobile-cart-bar"
      class="fixed bottom-[var(--cc-banner-h,0px)] inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] sm:hidden px-3.5 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] transition-all duration-300 ease-out"
      :class="showStickyMobileCart ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'"
      data-test="sticky-mobile-cart"
      :aria-hidden="!showStickyMobileCart"
    >
      <div class="flex items-center justify-between gap-3 max-w-lg mx-auto">
        
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <img
            v-if="galleryImages[0]"
            :src="galleryImages[0]"
            :alt="product.name"
            class="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50"
          />
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-900 truncate leading-tight">{{ product.name }}</p>
            <div class="flex items-baseline gap-1.5 mt-0.5">
              <span class="text-sm font-extrabold text-primary-700 leading-tight">{{ lineTotalFormatted }}</span>
              <span v-if="hasDeposit" class="text-[10px] text-slate-500 font-medium truncate block">
                {{ isDepositPaidSelected ? t('product.deposit_paid_pill', 'Consigne incluse') : t('product.deposit_core_first_pill', 'Sans consigne') }}
              </span>
            </div>
          </div>
        </div>

        
        <div class="shrink-0 flex items-center gap-2">
          <button
            v-if="showPrices"
            type="button"
            class="h-10 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 text-white"
            :class="addedToCart
              ? 'bg-emerald-600'
              : isOutOfStock
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'"
            :disabled="isOutOfStock"
            @click="addToCart"
          >
            <svg v-if="!addedToCart" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <span>{{ isOutOfStock ? t('product.out_of_stock') : addedToCart ? t('catalogue.added_to_cart') : t('catalogue.add_to_cart') }}</span>
          </button>
          <button
            v-else
            type="button"
            class="h-10 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap bg-primary-600 hover:bg-primary-700 text-white active:scale-95"
            @click="addProductToQuote"
          >
            {{ addedToQuote ? t('catalogue.added_to_quote') : t('catalogue.add_to_quote') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
