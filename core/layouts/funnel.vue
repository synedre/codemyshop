
<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
    
    <header class="border-b border-gray-100 dark:border-slate-800">
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0" :aria-label="t('common.common_back_to_home', 'Retour à l\'accueil')">
          
          <BrandWordmark v-if="logoLockup" align="center" />
          <NuxtImg
            v-else-if="logoSrc"
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
        <div class="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs sm:text-sm">
          
          <div v-if="languageLinks.length" class="flex items-center gap-2 border-r border-gray-200 dark:border-slate-700 pr-3">
            <a
              v-for="l in languageLinks"
              :key="l.code"
              :href="l.href"
              :class="l.code === activeLang ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'"
              class="uppercase text-xs tracking-wider transition-colors"
            >
              {{ l.code }}
            </a>
          </div>

          <div class="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
            <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span class="hidden sm:inline font-medium text-xs">{{ t('funnel.confidential', 'Confidentiel') }}</span>
          </div>
        </div>
      </div>
    </header>

    
    <main class="flex-1">
      <slot />
    </main>

    
    <footer class="border-t border-gray-100 dark:border-slate-800 mt-auto">
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
        <div class="flex items-center gap-2 order-1 sm:order-2 text-[10px] text-gray-400 dark:text-slate-500">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>{{ t('funnel.reply_sla', 'Réponse sous 24-48h ouvrées') }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { resolveLogoAlt } from '~/utils/logo-alt'
import { getRootLocale, localePrefix } from '~/utils/i18n-root-locale'

const { header } = useHeaderDb()
const { footer } = useFooterDb()
const { t: i18nt } = useI18nField()
const { t } = useHubT()
const { public: runtimePublic } = useRuntimeConfig()
const { activeLang } = useRouteLang()
const route = useRoute()

const { data: i18nAlternates } = useFetch<{ alternates: Record<string, string> }>(
  '/api/i18n/alternates',
  {
    query: computed(() => ({ path: route.path, iso: activeLang.value })),
    watch: [() => route.path, activeLang],
    default: () => ({ alternates: {} as Record<string, string> }),
  },
)

const rootLocale = computed(() => getRootLocale(runtimePublic))

const availableLanguages = computed<Array<{ code: string; label?: string; href?: string }>>(() => {
  const list = header.value?.topBar?.languages
  if (Array.isArray(list) && list.length > 1) return list
  return [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'de', label: 'DE' },
  ]
})

const marchesOuverts = useMarchesOuverts()
const languageLinks = computed(() => {
  return availableLanguages.value
    .filter(l => marchesOuverts.includes(l.code.toLowerCase()))
    .map((l) => {
      const code = l.code.toLowerCase()
      const href = i18nAlternates.value?.alternates?.[code]
        || l.href
        || (localePrefix(code, rootLocale.value) || '/')
      return { code, href }
    })
})

const brandName = computed(() => String((runtimePublic as any).brandName ?? ''))
const year = new Date().getFullYear()

const logoLockup = computed(() => {
  const l = (runtimePublic as any)?.logoLockup
  return l && typeof l === 'object' && l.primary ? l : null
})
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

