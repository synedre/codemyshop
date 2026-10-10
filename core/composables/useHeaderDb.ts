

export interface HeaderDbData {
  logo: {
    src?: string | null
    alt?: Record<string, string> | null
    text?: Record<string, string> | null
    href?: string
    class?: string
  }
  topBar: {
    message?: Record<string, string> | null
    
    messageMobile?: Record<string, string> | null
    showLanguages?: boolean
    align?: 'left' | 'center'
    languages?: Array<{ code: string; label: Record<string, string>; href: string }>
  }
  contactEmail?: string | null
  contactPhone?: string | null
  features: {
    showSearch?: boolean
    showWishlist?: boolean
    showLogin?: boolean
    showContact?: boolean
    showCart?: boolean
    showQuoteButton?: boolean
    showBlogLink?: boolean
    showContactLink?: boolean
    showGiftcardLink?: boolean
    stickyHeader?: boolean
    
    staticHeader?: boolean
    headerLayout?: string
  }
  
  navBar?: {
    backgroundColor?: string | null
    textColor?: string | null
  } | null
  

  headerLinks?: Record<string, Array<{
    label: string
    href: string
    icon: string | null
    position: number
  }>>
  
  storesHref?: string | null
}

const DEFAULT_HEADER: HeaderDbData = {
  logo: { href: '/' },
  topBar: {},
  features: {},
}

export function useHeaderDb() {
  const { activeLang } = useRouteLang()

  
  
  
  
  
  
  
  const { data, status } = useAsyncData<{ header: HeaderDbData | null }>(
    'header-db',
    async () => {
      if (import.meta.server) {
        const event = useRequestEvent()
        
        
        const resolveHeaderShell = (event?.context as any)?.resolveHeaderShell as
          | (() => Promise<{ header: HeaderDbData | null; degraded: boolean }>)
          | undefined
        if (!event || !resolveHeaderShell) return { header: null }
        const { header, degraded } = await resolveHeaderShell()
        if (degraded && !(header as any)?.logo?.src) {
          
          
          setResponseStatus(event, 503)
        }
        return { header }
      }
      return $fetch<{ header: HeaderDbData | null }>('/api/header-config', {
        query: { lang: activeLang.value },
      })
    },
    {
      watch: [activeLang],
      default: () => ({ header: null }),
    },
  )

  const builderHeader = useState<HeaderDbData | null>('header_builder_override', () => null)

  
  
  
  
  
  
  const lastGoodHeader = useState<HeaderDbData | null>('header_db_resolved', () => null)
  watch(
    () => data.value?.header,
    (h) => { if (h) lastGoodHeader.value = h },
    { immediate: true },
  )

  
  
  
  
  const dirty = useState<boolean>('header_dirty', () => false)

  const header = computed<HeaderDbData>(() => {
    if (builderHeader.value) return builderHeader.value
    if (data.value?.header) return data.value.header
    
    if (lastGoodHeader.value) return lastGoodHeader.value
    return DEFAULT_HEADER
  })

  function loadIntoBuilder() {
    
    
    if (data.value?.header) {
      builderHeader.value = JSON.parse(JSON.stringify(data.value.header))
      dirty.value = false
    }
  }

  function updateLogo(patch: Partial<HeaderDbData['logo']>) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = {
      ...builderHeader.value!,
      logo: { ...builderHeader.value!.logo, ...patch },
    }
    dirty.value = true
  }

  function updateTopBar(patch: Partial<HeaderDbData['topBar']>) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = {
      ...builderHeader.value!,
      topBar: { ...builderHeader.value!.topBar, ...patch },
    }
    dirty.value = true
  }

  function updateFeatures(patch: Partial<HeaderDbData['features']>) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = {
      ...builderHeader.value!,
      features: { ...builderHeader.value!.features, ...patch },
    }
    dirty.value = true
  }

  function updateContactEmail(email: string) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = { ...builderHeader.value!, contactEmail: email }
    dirty.value = true
  }

  async function syncToDb() {
    if (!builderHeader.value) return
    await $fetch('/api/header-config/sync', {
      method: 'PUT',
      body: { header: builderHeader.value },
    })
    await refreshNuxtData('header-db')
    dirty.value = false
  }

  function clearBuilderOverride() {
    builderHeader.value = null
    dirty.value = false
  }

  return {
    header,
    status,
    builderHeader,
    dirty,
    loadIntoBuilder,
    updateLogo,
    updateTopBar,
    updateFeatures,
    updateContactEmail,
    syncToDb,
    clearBuilderOverride,
  }
}
