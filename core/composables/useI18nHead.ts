

import { toCanonicalPivotPath } from '~/utils/i18n-canonical-path'
import { getRootLocale, getPrefixedLocales, rootDiffersFromPivot } from '~/utils/i18n-root-locale'
import { useMarchesOuverts } from './useMarchesOuverts'
import { buildAlternatesFromOverride, buildAlternatesFallback } from '~/utils/i18n-hreflang'

export type AlternatesOverride = Record<string, string>

export function useI18nAlternates(
  path: Ref<string> | string,
  iso: Ref<string> | string,
) {
  const config = useRuntimeConfig()
  const base = ((config.public as any).psFrontUrl as string || '').replace(/\/$/, '')
  const i18nAlternatesOverride = useState<Record<string, string> | null>('i18nAlternatesOverride', () => null)

  const pathVal = computed(() => {
    const v = isRef(path) ? path.value : path
    return v || ''
  })
  const isoVal = computed(() => (isRef(iso) ? iso.value : iso) || 'fr')

  
  
  const asyncKey = computed(() => `i18n-alternates-${pathVal.value || '_root'}-${isoVal.value}`)

  const { data: alternatesData } = useAsyncData<{ ok: boolean; alternates: Record<string, string> }>(
    () => asyncKey.value,
    () => {
      if (!pathVal.value) return Promise.resolve(null as any)
      return $fetch('/api/i18n/alternates', {
        query: { path: pathVal.value, iso: isoVal.value },
      })
    },
    { watch: [asyncKey] },
  )

  

  function toAbsAlternates(data: { ok: boolean; alternates: Record<string, string> } | null | undefined): Record<string, string> | null {
    if (!data?.ok || !data.alternates || !Object.keys(data.alternates).length) return null
    const abs: Record<string, string> = {}
    for (const [isoKey, relPath] of Object.entries(data.alternates)) {
      abs[isoKey] = relPath.startsWith('http') ? relPath : `${base}${relPath}`
    }
    return abs
  }

  
  
  
  
  
  
  
  
  
  const rootLocale = getRootLocale(config.public)
  
  const allLocales = useMarchesOuverts()

  const absAlternates = computed(() => toAbsAlternates(alternatesData.value))

  const hreflangLinks = computed(() => {
    if (!pathVal.value) return []
    const overrideVal = absAlternates.value
    if (!overrideVal) return []
    return buildAlternatesFromOverride({ override: overrideVal, allLocales, rootLocale })
  })

  
  
  
  
  
  useHead(computed(() => ({ link: hreflangLinks.value })))

  
  watchEffect(() => {
    if (!pathVal.value) return
    i18nAlternatesOverride.value = absAlternates.value
  })

  onUnmounted(() => {
    i18nAlternatesOverride.value = null
  })

  return { alternatesData }
}

export function useI18nHead(alternatesOverride?: Ref<AlternatesOverride | null> | AlternatesOverride | null) {
  const route = useRoute()
  const { localizeRoot, canonicalizeRoot } = useRootSegments()
  const config = useRuntimeConfig()
  const base = ((config.public as any).psFrontUrl as string || '').replace(/\/$/, '')
  const rootLocale = getRootLocale(config.public)
  
  const allLocales = useMarchesOuverts()
  
  
  const prefixedLocales = getPrefixedLocales(config.public)
  
  
  const unprefixedIso = rootDiffersFromPivot(config.public) ? rootLocale : undefined

  

  const canonicalPath = computed<string>(() =>
    toCanonicalPivotPath(route.path || '/', prefixedLocales, canonicalizeRoot, unprefixedIso),
  )

  

  const alternates = computed(() => {
    const overrideVal = alternatesOverride
      ? (isRef(alternatesOverride) ? alternatesOverride.value : alternatesOverride)
      : null

    
    
    
    
    if (overrideVal && Object.keys(overrideVal).length > 0) {
      return buildAlternatesFromOverride({ override: overrideVal, allLocales, rootLocale })
    }
    return buildAlternatesFallback({
      base,
      pivotPath: canonicalPath.value,
      allLocales,
      rootLocale,
      localizeRoot,
    })
  })

  useHead({
    link: () => alternates.value,
  })

  return { canonicalPath, alternates }
}
