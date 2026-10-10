
<script setup lang="ts">
import { buildCanonicalCategoryPath, isSameDecodedPath, needsCategoryRedirect, rawQueryString, resolveCanonicalPagePath } from '~/utils/category-canonical'
import { productJsonLdFromPayload } from '~/utils/product-jsonld-from-payload'
import { buildCategoryBreadcrumbJsonLd, buildCategoryCollectionPageJsonLd } from '~/utils/category-jsonld'
import { isEmptyCategory, isThinLeaf } from '~/utils/thin-leaf'
import { isSingleProductAnswer } from '~/utils/single-product-answer'
import { getRootLocale } from '~/utils/i18n-root-locale'
import { resolveCategoryLayoutFlags } from '~/utils/category-layout-flags'
import { verticalScaleSlots } from '~/utils/vertical-scale'
import { resolveFacetPresentation } from '~/utils/facet-presentation'
import { resolveProductMetaDescription } from '~/utils/product-meta-description'
import { aUnParametreInconnu } from '~/utils/seo-parametres-inconnus'
import { categoryFetchKey } from '~/utils/catch-all-category'

interface Props {
  pilier: string
  
  
  
  
  initialSegments?: string[]
}
const props = defineProps<Props>()

const { localePath } = useLocalePath()
const { t } = useT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')

const echelleVerticale = verticalScaleSlots(_cfg.public as Record<string, any>)

const siloShippingEnabled = computed(() => (_cfg.public as any)?.siloShipping === true)

const { showClickCollect } = useClickCollect()
const siloShippingVisible = computed(() => siloShippingEnabled.value && showClickCollect.value)

const { isSportLayout } = useProductLayout()

const categoryProductsFirst = computed(() => !!(_cfg.public as any).categoryProductsFirst)

const categoryFlags = computed(() => resolveCategoryLayoutFlags(_cfg.public as any))
const isCatalog = computed(() => categoryFlags.value.layout === 'catalog')
const brandName = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '').replace(/\/+$/, '')
const locales: string[] = ((_cfg.public as any).i18nLocales as string[]) || ['en']
const route = useRoute()
const { isEditMode } = useEditMode()
const { registerContext, clearContext } = useEditorContext()

const segments = computed<string[]>(() => {
  if (props.initialSegments !== undefined) {
    return props.initialSegments.filter(Boolean) as string[]
  }
  const raw = route.params.path
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  return arr.filter(Boolean) as string[]
})

const pathParam = computed(() => segments.value.join('/'))

interface CategoryChild { id: number; slug: string; path: string; label: string }
interface CategoryFaqItem { position: number; question: string; answer_html: string }
interface CategoryAggregate { total: number; total_in_stock: number | null; price_min: number | null; price_max: number | null; known?: boolean }

interface CategoryEditorialTileData {
  position: number
  colSpan: 1 | 2 | 3
  kind: 'image' | 'banner' | 'artwork'
  imageUrl: string | null
  linkUrl: string | null
  logoUrl: string | null
  title: string | null
  subtitle: string | null
  quote: string | null
  author: string | null
}
interface CategoryResponse {
  found: boolean
  kind: 'pilier' | 'category'
  pilier: string
  id_category: number | null
  id_parent: number | null
  level_depth: number
  path: string
  
  path_fr: string
  
  pilier_slug_fr: string
  
  pilier_slug: string
  slug: string
  name: string
  h1: string
  meta_title: string
  meta_description: string
  intro_html: string | null
  long_description_html: string | null
  image_url: string | null
  
  image_alt?: string | null
  breadcrumb: Array<{ label: string; path: string }>
  children: CategoryChild[]
  
  sidebar_children?: CategoryChild[]
  siblings?: CategoryChild[]
  aggregate: CategoryAggregate
  faq: CategoryFaqItem[]
  
  tiles?: CategoryEditorialTileData[]
  
  guide_link?: { label: string, url: string } | null
}

const { activeLang: siloLang } = useRouteLang()
const { data: category, error } = await useFetch<CategoryResponse>('/api/category', {
  query: { path: pathParam, pilier: props.pilier, lang: siloLang },
  key: () => categoryFetchKey(props.pilier, pathParam.value, siloLang.value),
  watch: [siloLang],
})

if (category.value?.found) {
  const canonicalCategoryPath = buildCanonicalCategoryPath({
    lang: siloLang.value,
    
    
    
    
    
    
    
    
    
    
    
    defaultLocale: getRootLocale(_cfg.public),
    pilierSlug: category.value.pilier_slug,
    innerPath: category.value.path,
  })
  const payloadRender = import.meta.server && !!useRequestEvent()?.context?.payloadRender
  if (needsCategoryRedirect(route.path, canonicalCategoryPath, { payloadRender })) {
    
    
    const queryString = rawQueryString(route.fullPath)
    await navigateTo(
      queryString ? `${canonicalCategoryPath}?${queryString}` : canonicalCategoryPath,
      { redirectCode: 301 },
    )
  }
}

interface ProductBySlugResponse {
  found: boolean
  id_product?: number
  name?: string
  pilier?: string
  breadcrumb?: Array<{ label: string; path: string; slug: string }>
}
const isProductPage = ref(false)
const productId = ref<number | null>(null)
const productBreadcrumb = ref<Array<{ label: string; path: string }>>([])
const productPilier = ref<string>('')

const _catErr = error.value as { statusCode?: number } | null
const _catSc = _catErr?.statusCode

if (_catErr && (_catSc == null || _catSc >= 500)) {
  
  
  if (import.meta.server) logTransientFailure('category', _catErr, route.path)
  throw createError({
    statusCode: 503,
    statusMessage: 'Catégorie momentanément indisponible',
    fatal: false,
  })
}

if (error.value || !category.value?.found) {
  const lastSegment = segments.value[segments.value.length - 1]
  
  
  
  
  if (lastSegment && segments.value.length >= 1) {
    const parentPath = segments.value.slice(0, -1).join('/')
    const { data: productLookup } = await useFetch<ProductBySlugResponse>('/api/product-by-slug', {
      query: { slug: lastSegment, siloPath: parentPath, lang: siloLang },
      key: () => `product-slug-${parentPath}-${lastSegment}-${siloLang.value}`,
      watch: [siloLang],
    })
    if (productLookup.value?.found && productLookup.value.id_product) {
      isProductPage.value = true
      productId.value = productLookup.value.id_product
      productBreadcrumb.value = productLookup.value.breadcrumb ?? []
      productPilier.value = productLookup.value.pilier ?? props.pilier

      
      
      
      
      const { data: canonical } = await useFetch<{ found: boolean; path?: string }>('/api/product-url-by-id', {
        query: { id: productLookup.value.id_product, lang: siloLang },
        
        
        
        key: () => `product-canonical-${productLookup.value?.id_product ?? 0}-${siloLang.value}`,
        watch: [siloLang],
      })
      const canonicalPath = canonical.value?.path
      
      
      if (canonicalPath && !isSameDecodedPath(canonicalPath, route.path)) {
        await navigateTo(canonicalPath, { redirectCode: 301 })
      }
    } else {
      throw createError({ statusCode: 404, statusMessage: 'Catégorie introuvable' })
    }
  } else {
    throw createError({ statusCode: 404, statusMessage: 'Catégorie introuvable' })
  }
}

const { data: productData, error: productError } = isProductPage.value && productId.value
  ? await useFetch(`/api/catalogue/product/${productId.value}`, {
      query: { clientId, lang: siloLang },
      key: () => `product-${productId.value}-${siloLang.value}`,
      watch: [siloLang],
    })
  : { data: ref(null), error: ref(null) }

const product = computed(() => {
  const raw = productData.value
  return (raw as any)?.product ?? raw ?? null
})

if (isProductPage.value && (productError.value || !product.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable' })
}

const canonicalBase = psFrontUrl

const { activeLang: _catLang } = useRouteLang()
const canonicalPath = computed(() => resolveCanonicalPagePath({
  lang: _catLang.value,
  rootLocale: getRootLocale(_cfg.public),
  routePath: route.path,
  isProductPage: isProductPage.value,
  pilier: props.pilier,
  productPath: pathParam.value,
  categoryInnerPath: category.value?.path ?? '',
}))
const canonicalUrl = computed(() => `${canonicalBase}${canonicalPath.value}`)

useI18nAlternates(
  computed(() => route.path),
  computed(() => _catLang.value),
)

const currentPage = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const isFirstPage = computed(() => currentPage.value === 1)

const facetedNavEnabled = computed(() => !!(_cfg.public as any).facetedNav)

const hasTierBParam = computed(() => {
  if (!facetedNavEnabled.value) return false
  const q = route.query
  if (q.f && String(q.f).trim()) return true
  if (q.priceMin && Number(q.priceMin) > 0) return true
  if (q.priceMax && Number(q.priceMax) < 10000) return true
  if (q.sort && String(q.sort) !== 'name_asc') return true
  return false
})

if (isProductPage.value) {
  
  
  
  
  
  
  
  
  
  
  useHead(() => {
    const p: any = product.value
    const metaTitle = (p?.meta_title || '').trim()
    const metaDesc = (p?.meta_description || '').trim()
    const desc = resolveProductMetaDescription(p)
    const scripts: any[] = []
    const rawProductImg = p?.images?.[0]
    const absoluteProductImg = rawProductImg
      ? (rawProductImg.startsWith('http://') || rawProductImg.startsWith('https://')
          ? rawProductImg
          : `${canonicalBase}${rawProductImg.startsWith('/') ? '' : '/'}${rawProductImg}`)
      : undefined
    const currentYear = new Date().getFullYear()

    if (p) {
      
      
      scripts.push({
        key: 'jsonld-product',
        type: 'application/ld+json',
        
        
        innerHTML: JSON.stringify(productJsonLdFromPayload(p, {
          image: absoluteProductImg,
          url: canonicalUrl.value,
          brandFallback: brandName,
          year: currentYear,
        })),
      })
      const faq = (p.faq ?? []) as Array<{ position: number; question: string; answer_html: string }>
      if (faq.length) {
        scripts.push({
          key: 'jsonld-product-faq',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.slice().sort((a, b) => a.position - b.position).map(it => ({
              '@type': 'Question',
              name: it.question,
              acceptedAnswer: { '@type': 'Answer', text: stripHtml(it.answer_html) },
            })),
          }),
        })
      }
      const bc = (productBreadcrumb.value ?? []) as Array<{ label: string; path: string }>
      const pil = productPilier.value || props.pilier
      scripts.push({
        key: 'jsonld-product-breadcrumb',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(buildCategoryBreadcrumbJsonLd({
          base: canonicalBase,
          pilier: pil,
          crumbs: bc,
          localize: localePath,
          home: { name: t('catalogue.breadcrumb_home') },
          current: { name: p.name, url: canonicalUrl.value },
        })),
      })
    }
    return {
      title: metaTitle || (p ? `${p.name} — ${brandName}` : `Produit — ${brandName}`),
      meta: [
        { name: 'description', content: desc },
        
        ...(p?.index_tier_closed === true ? [{ name: 'robots', content: 'noindex,follow' }] : []),
        { property: 'og:title', content: metaTitle || p?.name || brandName },
        { property: 'og:description', content: desc },
        { property: 'og:image', content: absoluteProductImg ?? '' },
        { property: 'og:type', content: 'product' },
        { property: 'og:url', content: canonicalUrl.value },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: metaTitle || p?.name || brandName },
        { name: 'twitter:description', content: desc },
        ...(absoluteProductImg ? [{ name: 'twitter:image', content: absoluteProductImg }] : []),
      ],
      link: [{ rel: 'canonical', href: canonicalUrl.value }],
      script: scripts,
    }
  })
  useListingBodyId('product', () => productId.value)
} else {
  useCategoryBodyId(() => category.value?.id_category ?? null)
}

const jsonLdBreadcrumb = computed(() => {
  if (isProductPage.value || !category.value) return null
  return buildCategoryBreadcrumbJsonLd({
    base: canonicalBase,
    pilier: props.pilier,
    crumbs: category.value.breadcrumb,
    localize: localePath,
  })
})

const jsonLdItemList = computed(() => {
  if (isProductPage.value || !category.value) return null
  if (!category.value.children || category.value.children.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.value.name,
    itemListElement: category.value.children.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      url: `${canonicalBase}${localePath(`/${props.pilier}/${c.path}/`)}`,
    })),
  }
})

const jsonLdCollectionPage = computed(() => {
  if (isProductPage.value || !category.value) return null
  const total = category.value.aggregate?.total ?? 0
  if (total <= 0) return null
  return buildCategoryCollectionPageJsonLd({
    base: canonicalBase,
    name: category.value.name,
    description: category.value.meta_description || '',
    url: canonicalUrl.value,
    numberOfItems: total,
    brandName,
    imageUrl: category.value.image_url,
    imageAlt: category.value.image_alt || category.value.name,
  })
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
const jsonLdFaq = computed(() => {
  if (isProductPage.value || !category.value) return null
  const items = category.value.faq ?? []
  if (items.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: stripHtml(item.answer_html) },
      })),
  }
})

const jsonLdScripts = computed(() => {
  const blobs = [
    { key: 'jsonld-breadcrumb', data: jsonLdBreadcrumb.value },
    { key: 'jsonld-collectionpage', data: jsonLdCollectionPage.value },
    { key: 'jsonld-itemlist', data: jsonLdItemList.value },
    { key: 'jsonld-faq', data: jsonLdFaq.value },
  ]
  return blobs
    .filter(b => b.data !== null)
    .map(b => ({
      key: b.key,
      type: 'application/ld+json',
      innerHTML: JSON.stringify(b.data),
    }))
})

if (!isProductPage.value) {
  useHead(() => {
    const paginated = !isFirstPage.value
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const isTierB = hasTierBParam.value
    
    
    
    
    
    
    
    
    
    
    
    const thinLeaf = isThinLeaf({
      total: category.value?.aggregate?.total ?? 0,
      hasChildren: !!category.value?.children?.length,
      minProducts: (_cfg.public as any).thinLeafMinProducts,
    })
    
    
    
    const emptyCategory = isEmptyCategory({
      total: category.value?.aggregate?.total,
      totalKnown: category.value?.aggregate?.known,
      levelDepth: category.value?.level_depth,
    })
    
    
    const tierClosed = category.value?.index_tier_closed === true
    
    
    const parametreInconnu = aUnParametreInconnu(route.query)
    
    const needsNoindex = isTierB || paginated || thinLeaf || emptyCategory || tierClosed || parametreInconnu
    return {
      title: category.value?.meta_title ?? brandName,
      meta: [
        { name: 'description', content: category.value?.meta_description ?? '' },
        ...(needsNoindex ? [{ name: 'robots', content: 'noindex,follow' }] : []),
        { property: 'og:title', content: category.value?.meta_title ?? '' },
        { property: 'og:description', content: category.value?.meta_description ?? '' },
        { property: 'og:url', content: canonicalUrl.value },
        { property: 'og:type', content: 'website' },
        ...(category.value?.image_url
          ? [
              { property: 'og:image', content: `${canonicalBase}${category.value.image_url}` },
              { property: 'og:image:alt', content: category.value.image_alt || category.value.name },
            ]
          : []),
      ],
      link: [{ rel: 'canonical', href: canonicalUrl.value }],
      script: jsonLdScripts.value,
    }
  })
}

const hasProducts = computed(
  () => !!category.value && (category.value.aggregate?.total ?? 0) > 0,
)
const hasFaq = computed(() => (category.value?.faq?.length ?? 0) > 0)
const hasCategoryDescription = computed(() => !!category.value?.long_description_html)

const articlesCountQuery = computed(() => ({
  categoryId: category.value?.id_category ?? 0,
  limit: 8,
  lang: siloLang.value,
}))
const { data: articlesCountData } = await useFetch<{ total: number }>('/api/catalogue/articles', {
  query: articlesCountQuery,
  key: () => `articles-cat-${category.value?.id_category ?? 0}-${siloLang.value}`,
  immediate: !!category.value?.id_category,
  watch: [articlesCountQuery],
})
const hasCategoryArticles = computed(
  () => !!category.value?.id_category && (articlesCountData.value?.total ?? 0) > 0,
)

const categoryPageSectionsEnabled = computed(() => categoryFlags.value.pageSections)

const categoryArticlesLayout = computed(() => categoryFlags.value.articlesLayout)

const categoryHeroImageSide = computed(() => categoryFlags.value.heroImageSide)
const categoryHeroImagePlaceholder = computed(() => categoryFlags.value.heroImagePlaceholder)

const breadcrumbHidden = computed(() => categoryFlags.value.breadcrumb === 'hidden')
const categoryHeroLayout = computed(() => categoryFlags.value.heroLayout)
const categoryTitleTone = computed(() => categoryFlags.value.titleTone)
const categoryLongDescriptionVisible = computed(() => categoryFlags.value.longDescription === 'visible')
const sectionTitleClass = computed(() => categoryTitleTone.value === 'ink'
  ? 'mb-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white'
  : 'mb-5 text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100')
const categoryArticlesSeeAllHref = computed(() => categoryFlags.value.articlesSeeAllHref)
const categorySectionsQuery = computed(() => ({
  parent_type: 'category',
  parent_id: category.value?.id_category ?? 0,
  lang: siloLang.value,
}))
const { data: categorySectionsData } = await useFetch<{ sections: any[] }>('/api/page-sections', {
  query: categorySectionsQuery,
  key: () => `category-sections-${category.value?.id_category ?? 0}-${siloLang.value}`,
  immediate: categoryPageSectionsEnabled.value && !!category.value?.id_category,
  watch: [categorySectionsQuery],
  default: () => ({ sections: [] }),
})

const categorySections = computed<any[]>(() => {
  if (!categoryPageSectionsEnabled.value) return []
  return [...((categorySectionsData.value as any)?.sections ?? [])]
    .filter((sec: any) => sec.active !== false)
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
})

const subcategoryPills = computed(() => {
  
  
  const source = (category.value?.children ?? []).length > 0
    ? (category.value?.children ?? [])
    : (category.value?.siblings ?? [])
  return source.map(c => ({
    label: c.label,
    
    
    
    url: `/${(c as any).pilier || props.pilier}/${c.path}/`,
  }))
})

const sidebarCategoryItems = computed(() => {
  const source = category.value?.sidebar_children?.length
    ? category.value.sidebar_children
    : subcategoryPills.value
  return source.map(c => ({
    label: c.label,
    url: `/${(c as any).pilier || props.pilier}/${c.path}/`,
  }))
})

const singleProductAnswer = computed(() => isSingleProductAnswer({
  total: category.value?.aggregate?.total ?? 0,
  hasChildren: (category.value?.children ?? []).length > 0,
  max: (_cfg.public as any).singleProductAnswerMax,
}))

const productsFirst = computed(() => categoryProductsFirst.value || singleProductAnswer.value)

const { data: siloRdvConfigData } = await useFetch<{ siloRdv: { enabled: boolean; repeatEvery: number; position: 'top' | 'bottom'; ctaLabel: string | null } }>('/api/silo-rdv-config', {
  key: 'silo-rdv-config',
})
const rdvConfig = computed(() => siloRdvConfigData.value?.siloRdv ?? { enabled: true, repeatEvery: 16, position: 'top' as const, ctaLabel: null })

const rdvEnabled = computed(() => (_cfg.public as any)?.siloRdv !== false && rdvConfig.value.enabled)
const rdvInterleaveEvery = computed(() => rdvEnabled.value ? Math.max(0, rdvConfig.value.repeatEvery) : 0)
const rdvOnTop = computed(() => rdvEnabled.value && rdvConfig.value.repeatEvery === 0 && rdvConfig.value.position === 'top')
const rdvOnBottom = computed(() => rdvEnabled.value && rdvConfig.value.repeatEvery === 0 && rdvConfig.value.position === 'bottom')
const rdvCtaLabel = computed(() => rdvConfig.value.ctaLabel || null)

const categoryGuideLink = computed(() => category.value?.guide_link ?? null)

function parseFParam(raw: string | undefined): Record<number, number[]> {
  if (!raw) return {}
  const out: Record<number, number[]> = {}
  for (const block of raw.split('|')) {
    const [fIdStr, valsStr] = block.split(':')
    const fId = Number(fIdStr)
    if (!fId || !valsStr) continue
    const vals = valsStr.split(',').map(Number).filter(Boolean)
    if (vals.length) out[fId] = vals
  }
  return out
}

function serializeFParam(features: Record<number, number[]>): string {
  return Object.entries(features)
    .filter(([, vs]) => vs.length)
    .map(([fId, vs]) => `${fId}:${vs.join(',')}`)
    .join('|')
}

function parseAParam(raw: string | undefined): Record<number, number[]> {
  if (!raw) return {}
  const out: Record<number, number[]> = {}
  for (const block of raw.split('|')) {
    const [gIdStr, valsStr] = block.split(':')
    const gId = Number(gIdStr)
    if (!gId || !valsStr) continue
    const vals = valsStr.split(',').map(Number).filter(Boolean)
    if (vals.length) out[gId] = vals
  }
  return out
}

function serializeAParam(attrs: Record<number, number[]>): string {
  return Object.entries(attrs)
    .filter(([, vs]) => vs.length)
    .map(([gId, vs]) => `${gId}:${vs.join(',')}`)
    .join('|')
}

function parseCParam(raw: string | undefined): number[] {
  if (!raw) return []
  return [...new Set(String(raw).split(',').map(Number).filter(n => Number.isInteger(n) && n > 0))]
}

const router = useRouter()

const facetPriceMin = ref<number>(Number(route.query.priceMin) || 0)
const facetPriceMax = ref<number>(Number(route.query.priceMax) || 10000)
const selectedFeatures = ref<Record<number, number[]>>({})
const selectedAttrs = ref<Record<number, number[]>>({})
const selectedCategories = ref<number[]>([])

if (facetedNavEnabled.value) {
  selectedFeatures.value = parseFParam(route.query.f as string)
  selectedAttrs.value = parseAParam(route.query.a as string)
  selectedCategories.value = parseCParam(route.query.c as string)
}

function syncFacetUrl() {
  const q: Record<string, any> = { ...route.query }
  if (facetPriceMin.value > 0) q.priceMin = facetPriceMin.value
  else delete q.priceMin
  if (facetPriceMax.value < 10000) q.priceMax = facetPriceMax.value
  else delete q.priceMax
  const fSerial = serializeFParam(selectedFeatures.value)
  if (fSerial) q.f = fSerial
  else delete q.f
  const aSerial = serializeAParam(selectedAttrs.value)
  if (aSerial) q.a = aSerial
  else delete q.a
  if (selectedCategories.value.length) q.c = selectedCategories.value.join(',')
  else delete q.c
  
  delete q.page
  router.replace({ query: q })
}

function toggleFeatureValue(fId: number, vId: number) {
  const current = selectedFeatures.value[fId] || []
  if (current.includes(vId)) {
    const next = current.filter(v => v !== vId)
    if (next.length) selectedFeatures.value = { ...selectedFeatures.value, [fId]: next }
    else {
      const { [fId]: _, ...rest } = selectedFeatures.value
      selectedFeatures.value = rest
    }
  } else {
    selectedFeatures.value = { ...selectedFeatures.value, [fId]: [...current, vId] }
  }
}

function toggleAttrValue(gId: number, aId: number) {
  const current = selectedAttrs.value[gId] || []
  if (current.includes(aId)) {
    const next = current.filter(v => v !== aId)
    if (next.length) selectedAttrs.value = { ...selectedAttrs.value, [gId]: next }
    else {
      const { [gId]: _, ...rest } = selectedAttrs.value
      selectedAttrs.value = rest
    }
  } else {
    selectedAttrs.value = { ...selectedAttrs.value, [gId]: [...current, aId] }
  }
}

function toggleCategoryValue(_fId: number, cId: number) {
  const current = selectedCategories.value
  selectedCategories.value = current.includes(cId) ? current.filter(v => v !== cId) : [...current, cId]
}

function resetFacetFilters() {
  selectedFeatures.value = {}
  selectedAttrs.value = {}
  selectedCategories.value = []
  facetPriceMin.value = 0
  facetPriceMax.value = 10000
}

const hasActiveFilters = computed(() =>
  Object.keys(selectedFeatures.value).length > 0
  || Object.keys(selectedAttrs.value).length > 0
  || selectedCategories.value.length > 0
  || facetPriceMin.value > 0
  || facetPriceMax.value < 10000,
)

const activeFiltersCount = computed(() => {
  let n = Object.values(selectedFeatures.value).filter(vs => vs.length > 0).length
  n += Object.values(selectedAttrs.value).filter(vs => vs.length > 0).length
  if (selectedCategories.value.length) n++
  if (facetPriceMin.value > 0) n++
  if (facetPriceMax.value < 10000) n++
  return n
})

if (facetedNavEnabled.value) {
  watch([facetPriceMin, facetPriceMax, selectedFeatures, selectedAttrs, selectedCategories], () => {
    syncFacetUrl()
  }, { deep: true })
}

const facetSidebarRef = ref<{ openMobile: () => void } | null>(null)

const facetsKey = computed(() =>
  `facets-cat-${category.value?.id_category ?? 0}-${serializeFParam(selectedFeatures.value)}-${serializeAParam(selectedAttrs.value)}-${selectedCategories.value.join(',')}-${facetPriceMin.value}-${facetPriceMax.value}`,
)

const facetsQuery = computed(() => ({
  
  
  
  ...(clientId ? { clientId } : {}),
  lang: siloLang.value,
  ...(serializeFParam(selectedFeatures.value) ? { f: serializeFParam(selectedFeatures.value) } : {}),
  ...(serializeAParam(selectedAttrs.value) ? { a: serializeAParam(selectedAttrs.value) } : {}),
  ...(selectedCategories.value.length ? { c: selectedCategories.value.join(',') } : {}),
  ...(facetPriceMin.value > 0 ? { priceMin: facetPriceMin.value } : {}),
  ...(facetPriceMax.value < 10000 ? { priceMax: facetPriceMax.value } : {}),
}))

const { data: facetsData } = facetedNavEnabled.value
  ? await useFetch(
      () => `/api/catalogue/${category.value?.id_category ?? 0}/facets`,
      {
        query: facetsQuery,
        key: () => facetsKey.value,
        watch: [facetsKey, siloLang],
        immediate: !!category.value?.id_category,
      },
    )
  : { data: ref(null) }

function normalizeFacetName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

const facetOrder = computed<string[]>(() => ((_cfg.public as any).facetOrder as string[]) || [])
const facetHide = computed<string[]>(() => ((_cfg.public as any).facetHide as string[]) || [])

const facetPresentation = computed(() => resolveFacetPresentation(_cfg.public as any))

const sidebarDesLaTablette = computed(() => facetPresentation.value.sidebarFrom === 'md')

const facets = computed(() => {
  if (!facetedNavEnabled.value) return []
  const raw = (facetsData.value as any)?.facets ?? []
  let out = raw.filter((f: any) => !/marque|brand/i.test(f.name))

  
  
  
  
  const attrNames = new Set(
    out.filter((f: any) => f.source === 'attribute').map((f: any) => normalizeFacetName(f.name)),
  )
  if (attrNames.size) {
    out = out.filter((f: any) =>
      f.source === 'attribute' || f.source === 'category' || !attrNames.has(normalizeFacetName(f.name)))
  }

  
  
  
  if (facetHide.value.length) {
    const hidePatterns = facetHide.value.map(normalizeFacetName)
    
    
    out = out.filter((f: any) =>
      f.source === 'attribute' || f.source === 'category'
        ? true
        : !hidePatterns.some(p => normalizeFacetName(f.name).includes(p)))
  }

  if (facetOrder.value.length) {
    const orderPatterns = facetOrder.value.map(normalizeFacetName)
    const rank = (f: any) => {
      const name = normalizeFacetName(f.name)
      const idx = orderPatterns.findIndex(p => name.includes(p))
      return idx === -1 ? orderPatterns.length : idx
    }
    out = out
      .map((f: any, i: number) => ({ f, i, r: rank(f) }))
      .sort((a: any, b: any) => (a.r - b.r) || (a.i - b.i))
      .map((x: any) => x.f)
  }

  return out
})
const priceBounds = computed(() => (facetsData.value as any)?.price ?? { min: 0, max: 10000 })

const hasFacets = computed(() => facetedNavEnabled.value && facets.value.length > 0)

const gridQuery = computed<Record<string, string | number>>(() => {
  const q: Record<string, string | number> = { pilier: props.pilier }
  const id = category.value?.id_category
  if (id) q.id_category = id
  const o = String(route.query.origin ?? '').trim()
  const a = String(route.query.allergens ?? '').trim()
  if (o) q.origin = o
  if (a) q.allergens = a
  
  
  const fSerial = serializeFParam(selectedFeatures.value)
  if (fSerial) (q as any).f = fSerial
  const aSerial = serializeAParam(selectedAttrs.value)
  if (aSerial) (q as any).a = aSerial
  if (selectedCategories.value.length) (q as any).c = selectedCategories.value.join(',')
  if (facetPriceMin.value > 0) (q as any).priceMin = facetPriceMin.value
  if (facetPriceMax.value < 10000) (q as any).priceMax = facetPriceMax.value
  return q
})

interface TocItem { id: string; label: string }

const hasRelatedPillsSection = computed(
  () => singleProductAnswer.value && isFirstPage.value && subcategoryPills.value.length > 0,
)

const tocItems = computed<TocItem[]>(() => {
  const out: TocItem[] = []
  if (hasProducts.value) out.push({ id: 'produits', label: t('silo.toc_products') })
  if (hasRelatedPillsSection.value) {
    out.push({ id: 'categories-liees', label: t('silo.related_categories') })
  }
  if (siloShippingVisible.value) out.push({ id: 'livraison', label: t('silo.toc_shipping') })
  if (hasFaq.value) out.push({ id: 'faq', label: t('silo.toc_faq') })
  if (hasCategoryDescription.value && categoryLongDescriptionVisible.value) {
    out.push({ id: 'presentation', label: t('silo.toc_presentation') })
  }
  if (hasCategoryArticles.value) out.push({ id: 'articles', label: t('silo.toc_articles') })
  return out
})

function resolveSiloT(key: string): string {
  const v = t(key)
  return v === key || v.startsWith('silo.intro_fallback_') ? '' : v
}
const fallbackIntro = computed(() => {
  if (category.value?.kind === 'pilier') {
    return resolveSiloT(`silo.intro_fallback_${props.pilier}_root`)
        || resolveSiloT('silo.intro_fallback_root')
  }
  const tpl = resolveSiloT(`silo.intro_fallback_${props.pilier}_template`)
           || resolveSiloT('silo.intro_fallback_template')
           || '${label}'
  return tpl.replace('${label}', category.value?.name.toLowerCase() ?? '')
})

const editorSilo = useEditorSilo()

onMounted(() => {
  
  
  
  
  if (isProductPage.value && productId.value) {
    registerContext('product', {
      id_product: productId.value,
      label: (product.value as any)?.name ?? '',
    })
    return
  }
  if (category.value) {
    registerContext('silo', {
      path: category.value.path,
      slug: category.value.slug,
      label: category.value.name,
      id_silo: category.value.id_category,
      level: category.value.level_depth,
      kind: category.value.kind,
    })
    editorSilo.value = {
      h1: category.value.h1,
      intro_html: category.value.intro_html,
      image_path: category.value.image_url,
      image_alt: category.value.image_alt || category.value.name,
      meta_title: category.value.meta_title,
      meta_description: category.value.meta_description,
      id_category: category.value.id_category,
      slug: category.value.slug,
    }
  }
})
onUnmounted(() => {
  clearContext()
})

const liveH1 = computed(() =>
  isEditMode.value && editorSilo.value.h1 ? editorSilo.value.h1 : category.value?.h1,
)
const liveIntroHtml = computed(() =>
  isEditMode.value && editorSilo.value.intro_html ? editorSilo.value.intro_html : category.value?.intro_html,
)
const liveImagePath = computed(() =>
  isEditMode.value && editorSilo.value.image_path ? editorSilo.value.image_path : category.value?.image_url,
)
const liveImageAlt = computed(() =>
  isEditMode.value && editorSilo.value.image_alt
    ? editorSilo.value.image_alt
    
    : (category.value?.image_alt || category.value?.name),
)
</script>

<template>
  
  <div>
    
    <div v-if="isProductPage">
      
      <ProductDetailSport
        v-if="product && isSportLayout"
        :product="(product as any)"
        :breadcrumb="productBreadcrumb"
        :pilier="productPilier || props.pilier"
      />
      <ProductDetail
        v-else-if="product"
        :product="(product as any)"
        :breadcrumb="productBreadcrumb"
        :pilier="productPilier || props.pilier"
      />
      <div v-else class="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">{{ t('silo.silo_not_found') }}</h1>
        <NuxtLink to="/" class="text-primary-600 hover:underline">{{ t('silo.silo_back_home') }}</NuxtLink>
      </div>
    </div>

    
    
    <template v-else>
    <div class="mx-auto max-w-6xl px-4 pt-3 pb-12 sm:px-6">
      
      <nav :class="breadcrumbHidden ? 'sr-only' : 'mb-1 text-sm'" :aria-label="t('silo.breadcrumb_aria')">
        <ol class="flex flex-wrap items-center gap-2 text-slate-500">
          <li>
            <NuxtLink :to="localePath('/')" class="hover:text-emerald-700">{{ t('silo.breadcrumb_home') }}</NuxtLink>
          </li>
          <li v-for="(bc, i) in category!.breadcrumb" :key="i" class="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <NuxtLink
              :to="localePath(`/${props.pilier}${bc.path ? '/' + bc.path : ''}/`)"
              :class="[
                i === category!.breadcrumb.length - 1
                  ? 'font-medium text-emerald-700'
                  : 'hover:text-emerald-600',
              ]"
            >
              {{ bc.label }}
            </NuxtLink>
          </li>
        </ol>
      </nav>

      
      <CategoryHero
        v-if="isFirstPage && !isCatalog"
        :h1="liveH1 ?? category!.h1"
        :intro-html="liveIntroHtml ?? category!.intro_html"
        :image-path="liveImagePath ?? category!.image_url"
        :image-alt="liveImageAlt ?? category!.name"
        :image-webp-srcset="(category as any)?.image_webp_srcset ?? null"
        :image-sizes="(category as any)?.image_sizes ?? null"
        :label="category!.name"
        :fallback-intro="fallbackIntro"
        :subcategories="isCatalog || singleProductAnswer ? [] : subcategoryPills"
        :compact-mode="productsFirst"
        :image-side="categoryHeroImageSide"
        :empty-image-placeholder="categoryHeroImagePlaceholder"
        :layout="categoryHeroLayout"
        :title-tone="categoryTitleTone"
      />

      <div
        class="grid grid-cols-1 gap-10 items-start"
        :class="(isFirstPage || hasFacets)
          ? (isCatalog
            ? (sidebarDesLaTablette ? 'md:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]')
            : (sidebarDesLaTablette ? 'md:grid-cols-[minmax(0,1fr)_260px]' : 'lg:grid-cols-[minmax(0,1fr)_260px]'))
          : ''"
      >
        <article class="min-w-0 space-y-14" :class="isCatalog ? (sidebarDesLaTablette ? 'md:order-2' : 'lg:order-2') : ''">
          
          <CategoryHero
            v-if="isFirstPage && isCatalog"
            :h1="liveH1 ?? category!.h1"
            :intro-html="liveIntroHtml ?? category!.intro_html"
            :image-path="liveImagePath ?? category!.image_url"
            :image-alt="liveImageAlt ?? category!.name"
            :image-webp-srcset="(category as any)?.image_webp_srcset ?? null"
            :image-sizes="(category as any)?.image_sizes ?? null"
            :label="category!.name"
            :fallback-intro="fallbackIntro"
            :subcategories="isCatalog || singleProductAnswer ? [] : subcategoryPills"
            :compact-mode="productsFirst"
            :image-side="categoryHeroImageSide"
            :empty-image-placeholder="categoryHeroImagePlaceholder"
            :layout="categoryHeroLayout"
            :title-tone="categoryTitleTone"
          />

          
          <section v-if="hasProducts" id="produits" class="scroll-mt-24">

            
            
            <div v-if="hasFacets && !singleProductAnswer" class="flex items-center justify-end mb-4" :class="sidebarDesLaTablette ? 'md:hidden' : 'lg:hidden'">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:border-primary-600 hover:text-primary-700 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-600"
                @click="facetSidebarRef?.openMobile()"
              >
                <svg class="w-4 h-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                {{ t('catalogue.filters', 'Filtres') }}
                <span
                  v-if="activeFiltersCount > 0"
                  class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary-600 text-white text-xs font-semibold rounded-full"
                  aria-hidden="true"
                >{{ activeFiltersCount }}</span>
              </button>
            </div>

            
            <CategorySingleProductAnswer
              v-if="singleProductAnswer"
              endpoint="/api/catalogue/by-category"
              :query="gridQuery"
            />

            
            <CategoryProductGrid
              v-else
              :key="`cat-${category!.id_category}-p${$route.query.page || 1}-o${$route.query.origin || ''}-a${$route.query.allergens || ''}-f${$route.query.f || ''}-pm${$route.query.priceMin || 0}-px${$route.query.priceMax || 0}`"
              endpoint="/api/catalogue/by-category"
              :query="gridQuery"
              :canonical-path="canonicalPath"
              :canonical-base="canonicalBase"
              :key-prefix="`cat-${category!.id_category}`"
              :limit="24"
              :interleave-every="rdvInterleaveEvery"
              :interleave-on-top="rdvOnTop"
              :interleave-on-bottom="rdvOnBottom"
              :tiles="category?.tiles ?? []"
              :toolbar="categoryFlags.toolbar"
              :title="categoryFlags.toolbar === 'minimal' ? category!.name : undefined"
            >
              <template v-if="rdvEnabled" #interleave>
                <CategoryRdvCard variant="flat" :cta-label="rdvCtaLabel" />
              </template>
            </CategoryProductGrid>
          </section>

          
          <section
            v-if="productsFirst && isFirstPage && (liveIntroHtml ?? category!.intro_html)"
            class="scroll-mt-24"
          >
            <div
              class="prose prose-lg max-w-none
                     [&_p]:leading-relaxed [&_p]:text-slate-700
                     [&_a]:text-primary-600 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline
                     [&_strong]:text-slate-900 [&_strong]:font-semibold"
              v-html="liveIntroHtml ?? category!.intro_html"
            />
          </section>

          
          <CategoryRelatedPills
            v-if="hasRelatedPillsSection"
            :items="subcategoryPills"
            anchor="categories-liees"
          />

          
          <section v-if="isFirstPage && siloShippingVisible" id="livraison" class="scroll-mt-24">
            <h2 :class="sectionTitleClass">
              {{ t('silo.shipping_title') }}
            </h2>
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">{{ t('silo.shipping_pickup') }}</p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-400" v-html="t('silo.shipping_pickup_detail').replace(/\\n/g, '<br>')"></p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">{{ t('silo.shipping_delivery') }}</p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-400" v-html="t('silo.shipping_delivery_detail').replace(/\\n/g, '<br>')"></p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">{{ t('silo.shipping_packaging') }}</p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ t('silo.shipping_packaging_detail') }}</p>
              </div>
            </div>
          </section>

          
          <section v-if="hasFaq && isFirstPage" id="faq" class="scroll-mt-24">
            <CategoryFaq :items="category!.faq" />
          </section>

          
          <section v-if="hasCategoryDescription && isFirstPage && categoryLongDescriptionVisible" id="presentation" class="scroll-mt-24">
            <h2 :class="sectionTitleClass">
              {{ t('silo.presentation_title') }}
            </h2>
            <div
              class="max-w-3xl text-slate-700 dark:text-slate-300
                     [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_h2]:mt-10 [&_h2]:mb-3
                     [&_h2:first-child]:mt-0
                     [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_h3]:mt-6 [&_h3]:mb-2
                     [&_p]:mb-5 [&_p]:leading-relaxed
                     [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white
                     [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline
                     [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-1.5
                     [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-1.5
                     [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                     [&_thead]:bg-slate-50 dark:[&_thead]:bg-slate-800
                     [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700
                     [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700 [&_td]:align-top
                     [&_tbody_tr:nth-child(even)]:bg-slate-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-slate-800/30"
              v-html="category!.long_description_html"
            />
          </section>

          
          <section v-if="hasCategoryArticles && isFirstPage" id="articles" :class="echelleVerticale.categoryArticlesSection">
            <CategoryArticleCarousel
              endpoint="/api/catalogue/articles"
              :query="{ categoryId: category!.id_category!, limit: 8 }"
              :key-prefix="`articles-cat-${category!.id_category}`"
              :title="t('silo.articles_title')"
              :layout="categoryArticlesLayout"
              :see-all-href="categoryArticlesSeeAllHref"
              :see-all-label="categoryArticlesSeeAllHref ? t('silo.articles_see_all', 'voir tous les guides') : null"
            />
          </section>

        </article>

        
        <div
          v-if="isFirstPage || hasFacets"
          class="space-y-6 [&_.sticky]:!static [&_.sticky]:!top-auto [&_.sticky]:!max-h-none [&_.sticky]:!overflow-visible"
          :class="[
            sidebarDesLaTablette
              ? 'md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:overscroll-contain'
              : 'lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain',
            isCatalog ? (sidebarDesLaTablette ? 'md:order-1' : 'lg:order-1') : '',
          ]"
        >
          <CategorySubcategoryTree
            v-if="isCatalog"
            :title="categoryFlags.sidebarTitle ?? category!.name"
            :items="sidebarCategoryItems"
            :variant="categoryFlags.sidebarStyle"
          />
          <CategoryToc v-if="isFirstPage && !isCatalog" :items="tocItems" />
          <LazyCategoryFacetSidebar
            v-if="hasFacets"
            ref="facetSidebarRef"
            :facets="facets"
            :price="priceBounds"
            :selected-features="selectedFeatures"
            :selected-attrs="selectedAttrs"
            :selected-categories="selectedCategories"
            :price-min="facetPriceMin"
            :price-max="facetPriceMax"
            :has-active-filters="hasActiveFilters"
            :active-filters-count="activeFiltersCount"
            :presentation="facetPresentation"
            :guide-link="categoryGuideLink"
            @toggle-feature="toggleFeatureValue"
            @toggle-attr="toggleAttrValue"
            @toggle-category="toggleCategoryValue"
            @update-price-min="facetPriceMin = $event"
            @update-price-max="facetPriceMax = $event"
            @reset="resetFacetFilters"
          />
        </div>
      </div>

      
      <PageSections
        v-if="isFirstPage && categorySections.length"
        :sections="categorySections"
        context="cms"
      />
    </div>
    </template>
  </div>
</template>
