<template>
  <div :style="themeStyles" :class="[darkPage ? 'text-foreground font-sans' : 'bg-background text-foreground font-sans', shadowClass]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    
    <ClientOnly>
      <LazyPreviewBanner v-if="previewMode" />
      <LazyBuilderToolbar v-if="showBuilderToolbar" />
      
      <LazyPwaInstallBanner v-if="showPwaBanner" />
      
      <LazyCookieConsent v-if="showCookieConsent" />
      
      <LazyFloatingWhatsapp v-if="whatsappMode !== 'none'" :numero="whatsappNumero" :mode="whatsappMode" />
      
      <LazyChatbotIaWidget v-if="showChatbotIa" />
      
      <LazyAgeVerificationModal v-if="showAgeVerification" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { shouldShowCookieConsent } from './utils/cookie-consent-visibility'
import { shouldShowBuilderToolbar } from './utils/builder-toolbar-visibility'
import { modeWhatsappFlottant, numeroWhatsapp } from './utils/floating-whatsapp'
import { chatbotIaVisible } from './utils/chatbot-ia-display'
import { shouldExposePwaMetadata } from './utils/pwa-metadata-visibility'

const route = useRoute()
const darkPage = computed(() => route.meta.darkPage === true)
const { themeStyles, shadowClass, contentWidthClass, config } = useClientTheme()
const { theme: themeDb } = useThemeDb()
const { init: initDark } = useDarkMode()
const { init: initEditMode, canEdit } = useEditMode()
const { previewMode } = useClientDetection()

const showBuilderToolbar = computed(() => shouldShowBuilderToolbar({
  canEdit: canEdit.value,
  sansBuilder: !!route.meta.sansBuilder,
}))

const _pwaRc = useRuntimeConfig().public as Record<string, any>
if (shouldExposePwaMetadata(!!_pwaRc.pwaEnabled, route.path)) {
  useHead({
    link: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
    ],
    meta: [
      { name: 'theme-color', content: (_pwaRc.pwaThemeColor as string) || '#ffffff' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: (_pwaRc.pwaShortName as string) || (_pwaRc.brandName as string) || 'App' },
    ],
  })
}

const _psFlags = useState<Record<string, string>>('ps_flags', () => ({}))
const showPwaBanner = computed(() =>
  !!_pwaRc.pwaEnabled
  && !route.path.startsWith('/hub')
  && _psFlags.value?.PS_PWA_INSTALL_BANNER !== '0',
)

const { enabled: analyticsEnabled } = useAnalytics()
const { trackers: consentTrackers } = useCookieConsent()
const showCookieConsent = computed(() => shouldShowCookieConsent({
  analyticsEnabled: analyticsEnabled.value,
  trackersRegistered: consentTrackers.value.length > 0,
  path: route.path,
  sansTraceur: !!route.meta.sansTraceur,
}))

const whatsappNumero = numeroWhatsapp((_pwaRc.floatingWhatsapp as any)?.phone)
const whatsappMode = computed(() => modeWhatsappFlottant({
  numero: whatsappNumero,
  path: route.path,
  sansHeader: route.meta.layout === 'funnel',
  
  
  desktop: (_pwaRc.floatingWhatsapp as any)?.desktop === true,
}))

const showChatbotIa = computed(() => chatbotIaVisible({
  enabled: (_pwaRc.chatbotAi as any)?.enabled,
  path: route.path,
}))

const showAgeVerification = computed(() =>
  !!_pwaRc.ageVerificationRequired
  && !route.path.startsWith('/hub'),
)

const colorMode = 'light' as const

provide('contentWidthClass', contentWidthClass)

onMounted(() => {
  initDark(colorMode)
  initEditMode()
})

</script>

<style>
/* Global — applique la typo à TOUT le DOM y compris les Teleport hors du root app */
body, body *, body button, body input, body select, body textarea {
  font-family: var(--font-family, 'Inter', system-ui, sans-serif);
}
</style>
