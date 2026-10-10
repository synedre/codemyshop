<template>
  
  
  
  
  
  
  <div v-if="isInsideIframe" class="min-h-screen bg-background text-foreground font-sans">
    <LayoutTheHeader />
    
    <HookSlot name="displayHeader" />
    
    <main :class="isEditMode ? 'edit-mode' : ''">
      <slot />
    </main>
    <LayoutPrefooterZone />
    <LayoutTheFooter />
    
    <HookSlot name="displayFooterAfter" />
    <DemoControlBar />
    <ClientOnly>
      <LazyCartDrawer v-if="cartEnabled" />
      <LazyQuoteDrawer />
      <LazyChatbotWidget v-if="chatbotEnabled" />
    </ClientOnly>
  </div>

  
  
  
  <div v-else class="min-h-screen bg-background text-foreground font-sans flex">

    
    <ClientOnly>
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="-translate-x-full"
      >
        <LazyEditorBuilderSidebar v-if="isEditMode" />
      </Transition>
    </ClientOnly>

    
    <div
      class="flex-1 min-w-0 transition-all duration-200 ease-out"
      :class="[builderLayoutReady && isEditMode && viewportWidth ? 'bg-gray-100 dark:bg-slate-950' : '']"
      :style="builderLayoutReady && isEditMode ? { marginLeft: `${effectiveBuilderWidth}px` } : undefined"
    >
      
      <ClientOnly v-if="isEditMode">
        <LazyEditorViewportToolbar />
      </ClientOnly>

      
      <ClientOnly v-if="isEditMode && viewportWidth">
        <div class="mx-auto py-6 flex justify-center">
          <iframe
            :src="iframeSrc"
            :style="{ width: viewportWidth + 'px' }"
            class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-gray-200 dark:ring-slate-700 transition-all duration-300 ease-out"
            style="height: calc(100vh - 100px);"
            frameborder="0"
            title="Preview builder"
          />
        </div>
      </ClientOnly>

      
      <template v-else>
        <LayoutTheHeader />
        
        <HookSlot name="displayHeader" />
        
        <main :class="isEditMode ? 'edit-mode' : ''">
          <slot />
        </main>
        <LayoutPrefooterZone />
        <LayoutTheFooter />
        
        <HookSlot name="displayFooterAfter" />
        <DemoControlBar />
      </template>
    </div>

    
    <ClientOnly>
      <LazyCartDrawer v-if="cartEnabled" />
    </ClientOnly>

    
    <ClientOnly>
      <LazyQuoteDrawer />
    </ClientOnly>

    
    <ClientOnly>
      <LazyChatbotWidget v-if="chatbotEnabled" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { deepMerge } from '~/utils/deepMerge'

const { isEditMode }     = useEditMode()

const builderLayoutReady = ref(false)
onMounted(() => { builderLayoutReady.value = true })
const { config, resolvedClientId, previewMode } = useClientDetection()
const { header: headerDb } = useHeaderDb()

const { effectiveWidth: effectiveBuilderWidth } = useBuilderGeometry()

const cartEnabled = computed(() =>
  Boolean((headerDb.value as any)?.features?.showCart ?? (config.value as any)?.features?.showCart),
)

const { hasFeature, loadFeatures, loaded: featuresLoaded } = useFeatureFlag()
onMounted(() => { if (!featuresLoaded.value) loadFeatures() })
const chatbotEnabled = computed(() => hasFeature('chatbot'))

const { currentWidth: viewportWidth, isInsideIframe } = useEditorViewport()

const iframeSrc = ref('')
if (import.meta.client) {
  const u = new URL(window.location.href)
  u.searchParams.set('builder-preview', '1')
  iframeSrc.value = u.toString()
}

const auth               = useAuth({ forceEmployee: true })
const fetchMe            = (auth as any).fetchMe as (() => Promise<void>) | undefined
const checkSession       = (auth as any).checkSession as (() => Promise<void>) | undefined
const customerAuth       = useCustomerAuth()
const editor             = useEditorState()

const { public: runtimePublic } = useRuntimeConfig()
const faviconHref = computed(() => (runtimePublic.favicon as string) || '/favicon.svg')

const faviconType = computed(() => {
  const h = faviconHref.value.toLowerCase()
  return h.endsWith('.ico') ? 'image/x-icon' : h.endsWith('.png') ? 'image/png' : 'image/svg+xml'
})
useHead({
  link: [{ rel: 'icon', type: faviconType, href: faviconHref }],
})

const i18nAlternatesOverride = useState<Record<string, string> | null>('i18nAlternatesOverride', () => null)
useI18nHead(i18nAlternatesOverride)

const dbConfig = useState<Record<string, unknown> | null>('client_db_config', () => null)

const { data: _fetchedConfig } = await useFetch<Record<string, unknown>>(
  `/api/client-config/${resolvedClientId.value}`,
  { key: `client-config-${resolvedClientId.value}`, default: () => null },
)

if (_fetchedConfig.value) {
  const incomingClientId = (_fetchedConfig.value as { clientId?: string }).clientId
  const currentClientId  = (dbConfig.value as { clientId?: string } | null)?.clientId
  const isForeignConfig  = !!currentClientId && !!incomingClientId && incomingClientId !== currentClientId

  if (previewMode.value || !isForeignConfig) {
    dbConfig.value = _fetchedConfig.value
  } else if (import.meta.dev) {
    console.warn(`[white-label] config « ${incomingClientId} » ignorée : le tenant courant est « ${currentClientId} »`)
  }
}

await customerAuth.checkSession()
if (fetchMe) await fetchMe()
else if (checkSession) await checkSession()

const { loadFeatures: loadMarketplaceFeatures } = useFeatureFlag()
await loadMarketplaceFeatures()

onMounted(() => {
  if (isEditMode.value && dbConfig.value) {
    editor.initFromConfig(dbConfig.value as any)
  }
})
</script>
