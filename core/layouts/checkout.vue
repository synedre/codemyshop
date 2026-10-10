
<template>
  <div class="min-h-screen flex bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">

    
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
      class="flex-1 min-w-0 min-h-screen flex flex-col transition-all duration-200 ease-out"
      :style="builderLayoutReady && isEditMode ? { marginLeft: `${effectiveBuilderWidth}px` } : undefined"
    >
    <LayoutTheHeader v-if="chromeComplet" />

    
    <header v-else class="border-b border-gray-100 dark:border-slate-800">
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0" :aria-label="t('common.common_back_to_home', 'Retour à l\'accueil')">
          <NuxtImg
            v-if="logoSrc"
            :src="logoSrc"
            :alt="logoAlt"
            class="h-10 sm:h-12 w-auto max-w-[160px] sm:max-w-[200px] object-contain"
            width="200"
            height="56"
            preset="logo"
            sizes="160px sm:200px"
            loading="eager"
            fetchpriority="high"
            data-no-filter
          />
          <AppLogo v-else :size="40" />
        </NuxtLink>
        <div class="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
          <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span class="hidden sm:inline font-medium">Paiement sécurisé</span>
        </div>
      </div>
    </header>

    
    <main class="flex-1" :class="isEditMode ? 'edit-mode' : ''">
      <slot />
    </main>

    <LayoutPrefooterZone v-if="avecPrefooter" />
    <LayoutTheFooter v-if="chromeComplet" />

    
    <footer v-else class="border-t border-gray-100 dark:border-slate-800 mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-slate-400">
        <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 order-2 sm:order-1">
          <span>© {{ year }} {{ brandName }}</span>
          <NuxtLink
            v-for="link in legalLinks"
            :key="link.href"
            :to="link.href"
            class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {{ link.label }}
          </NuxtLink>
          <CookieSettingsLink class="hover:text-primary-600 dark:hover:text-primary-400" />
        </div>
        <div class="flex items-center gap-2 order-1 sm:order-2 font-medium tracking-wide text-gray-400 dark:text-slate-500">
          <span>CB</span>
          <span aria-hidden="true">·</span>
          <span>VISA</span>
          <span aria-hidden="true">·</span>
          <span>Mastercard</span>
          <span aria-hidden="true">·</span>
          <span>SEPA</span>
        </div>
      </div>
    </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { resolveLogoAlt } from '~/utils/logo-alt'
import { checkoutChromeComplet, prefooterDansTunnel } from '~/utils/checkout-chrome'

const props = defineProps<{ prefooter?: boolean }>()
const { isEditMode } = useEditMode()

const builderLayoutReady = ref(false)
onMounted(() => { builderLayoutReady.value = true })

const { effectiveWidth: effectiveBuilderWidth } = useBuilderGeometry()

const { header } = useHeaderDb()
const { footer } = useFooterDb()
const { t: i18nt } = useI18nField()
const { t } = useHubT()
const { public: runtimePublic } = useRuntimeConfig()

const brandName = computed(() => String((runtimePublic as any).brandName ?? ''))
const year = new Date().getFullYear()

const chromeComplet = computed(() => checkoutChromeComplet(runtimePublic as Record<string, any>))
const avecPrefooter = computed(() => prefooterDansTunnel(runtimePublic as Record<string, any>, props.prefooter === true))

const logoSrc = computed(() => header.value?.logo?.src || null)
const logoAlt = computed(() => resolveLogoAlt([
  i18nt(header.value?.logo?.alt),
  i18nt(header.value?.logo?.text),
  brandName.value,
]))

const legalLinks = computed<Array<{ href: string; label: string }>>(() => {
  const raw = (footer.value as any)?.bottomBar?.links as any[] | undefined
  if (!Array.isArray(raw) || !raw.length) return []
  return raw
    .filter((l) => l && typeof l.href === 'string' && l.href.length > 0)
    .map((l) => ({ href: String(l.href), label: i18nt(l.label) || String(l.href) }))
})

const faviconHref = computed(() => (runtimePublic.favicon as string) || '/favicon.svg')
const faviconType = computed(() => {
  const h = faviconHref.value.toLowerCase()
  return h.endsWith('.ico') ? 'image/x-icon' : h.endsWith('.png') ? 'image/png' : 'image/svg+xml'
})
useHead({
  link: [{ rel: 'icon', type: faviconType, href: faviconHref }],
})
</script>
