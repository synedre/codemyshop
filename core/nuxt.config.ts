

import { resolve } from 'node:path'
import { buildStatefulDenyPaths } from './utils/locale-route-roots'
import { PS_FRONT_URL_SENTINEL } from './server/mcp/constants'
import { prependErrorHandler } from './server/error-status-message'
import { OUTDATED_BUILD_INTERVAL_MS } from './utils/build-freshness'
import { serverSideEffectEntries } from './utils/server-side-effects'
import { HOST_DEPENDENT_ROUTES } from './utils/host-dependent-routes'
const __layerDir = resolve(import.meta.dirname ?? __dirname)
const PRIME_SECRET_ENV = resolve(__layerDir, 'server/boot/prime-secret-env.ts')

const SSR_CACHE_TTL = Number(process.env.NUXT_SSR_CACHE_TTL || 60)
const SSR_CACHE_HOMEPAGE = process.env.NUXT_SSR_CACHE_HOMEPAGE === '1'
const SSR_CACHE_DENY_EXTRA = (process.env.NUXT_SSR_CACHE_DENY_EXTRA || '')
  .split(',').map((s) => s.trim()).filter(Boolean)

const NO_CACHE = { swr: false, cache: false } as const
const SSR_CACHE = { swr: SSR_CACHE_TTL, cache: { base: 'redis' } } as const

const DOC_NO_CACHE = { ...NO_CACHE, headers: { 'cache-control': 'no-cache' } } as const

const STATEFUL_DENY = Object.fromEntries(buildStatefulDenyPaths().map((p) => [p, DOC_NO_CACHE]))
const DENY_EXTRA = Object.fromEntries(SSR_CACHE_DENY_EXTRA.map((p) => [p, DOC_NO_CACHE]))

export default defineNuxtConfig({
  
  
  
  
  extends: ['../runtime-base'],

  

  
  
  future: {
    compatibilityVersion: 4,
  },

  
  
  
  
  
  
  features: {
    inlineStyles: false,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/scripts',
    resolve(__layerDir, '..', 'community/modules/i18n-routes'),
  ],

  
  
  
  
  
  
  fonts: {
    defaults: {
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    experimental: {
      processCSSVariables: true,
    },
  },

  tailwindcss: {
    cssPath: resolve(__layerDir, 'assets/css/main.css'),
  },

  
  
  
  
  
  
  
  postcss: {
    plugins: {
      [resolve(__layerDir, 'build/postcss-strip-dark.cjs')]: {},
    },
    order: (names: string[]) => {
      const stripIdx = names.findIndex(n => n.endsWith('postcss-strip-dark.cjs'))
      if (stripIdx < 0) return names
      const stripName = names[stripIdx]
      return [...names.slice(0, stripIdx), ...names.slice(stripIdx + 1), stripName]
    },
  },

  
  
  
  image: {
    format: ['avif', 'webp'],
    quality: 80,
    screens: {
      xs: 320,
      
      
      mobile: 380,
      
      
      
      phone: 414,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    presets: {
      logo:      { modifiers: { format: 'webp', quality: 90, fit: 'inside' } },
      hero:      { modifiers: { format: 'webp', quality: 80, fit: 'cover' } },
      blogCover: { modifiers: { format: 'webp', quality: 80, fit: 'cover' } },
      avatar:    { modifiers: { format: 'webp', quality: 85, fit: 'cover' } },
    },
  },

  
  
  
  
  
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
    },
  },

  
  
  
  
  css: [
    resolve(__layerDir, 'assets/css/base-overrides.css'),
    resolve(__layerDir, 'assets/css/content-width.css'),
    resolve(__layerDir, 'assets/css/header-density.css'),
  ],

  
  
  
  
  alias: {
    '~/types':    resolve(__layerDir, 'types'),
    '~/utils':    resolve(__layerDir, 'utils'),
    '~/data':     resolve(__layerDir, 'data'),
    '~/config':   resolve(__layerDir, 'config'),
    '~/server':   resolve(__layerDir, 'server'),
    '~/modules':  resolve(__layerDir, '..', 'community/modules'),
    '~/composables': resolve(__layerDir, 'composables'),
    '~/enterprise/base':             resolve(__layerDir, '..', 'enterprise/base/modules'),
    '~/enterprise/ai':               resolve(__layerDir, '..', 'enterprise/ai/modules'),
    '~/enterprise/data':             resolve(__layerDir, '..', 'enterprise/data/modules'),
    '~/enterprise/seo':              resolve(__layerDir, '..', 'enterprise/seo/modules'),
    '~/enterprise/banking':          resolve(__layerDir, '..', 'enterprise/banking/modules'),
    '~/enterprise/vertical-food':    resolve(__layerDir, '..', 'enterprise/vertical-food/modules'),
    '~/enterprise/vertical-vape':    resolve(__layerDir, '..', 'enterprise/vertical-vape/modules'),
    '~/enterprise/vertical-fashion': resolve(__layerDir, '..', 'enterprise/vertical-fashion/modules'),
    '~/enterprise/vertical-jewelry': resolve(__layerDir, '..', 'enterprise/vertical-jewelry/modules'),
    '~/enterprise/misc':             resolve(__layerDir, '..', 'enterprise/misc/modules'),
    '~/enterprise':   resolve(__layerDir, '..', 'enterprise'),
    '~/internal':     resolve(__layerDir, '../..', 'mothership-app/modules'),
  },

  vite: {
    build: {
      
      
      
      sourcemap: false,
    },
  },

  
  typescript: {
    typeCheck: false,
  },

  
  sourcemap: { server: false, client: false },

  
  
  
  experimental: {
    
    
    
    
    
    buildCache: false,
    
    
    checkOutdatedBuildInterval: OUTDATED_BUILD_INTERVAL_MS,
    
    
    
    
    
    
    
    
    defaults: {
      nuxtLink: {
        prefetch: true,
        prefetchOn: { visibility: false, interaction: true },
      },
    },
  },

  
  
  
  
  
  
  
  runtimeConfig: {
    secret: '',
    
    
    
    
    
    apiEncryptionKey: '',
    prestashopApiKey: '',
    psBaseUrl: process.env.PS_BASE_URL ?? 'http://localhost:8080',
    psHost: process.env.PS_DOMAIN ?? 'localhost',
    anthropicApiKey: '',
    mistralApiKey: '',
    aiSourceType: process.env.AI_SOURCE_TYPE ?? 'contact_form',
    clientId: process.env.NUXT_CLIENT_ID ?? 'codemyshop',
    aiClientId: process.env.AI_CLIENT_ID ?? process.env.NUXT_CLIENT_ID ?? 'codemyshop',

    
    hubApiUrl: process.env.NUXT_HUB_API_URL ?? '',

    
    uploadStaticDir: process.env.NUXT_UPLOAD_STATIC_DIR ?? '',

    
    
    
    
    
    
    
    plateApiToken: '',
    plateApiUrl: process.env.NUXT_PLATE_API_URL ?? '',
    
    
    
    plateApiTypesUrl: process.env.NUXT_PLATE_API_TYPES_URL ?? '',
    plateApiCountry: process.env.NUXT_PLATE_API_COUNTRY ?? 'FR',
    
    
    
    plateApiCountries: process.env.NUXT_PLATE_API_COUNTRIES ?? '',
    
    plateApiVinUrl: process.env.NUXT_PLATE_API_VIN_URL ?? '',

    
    
    
    
    imgWriterUrl:    process.env.NUXT_IMG_WRITER_URL    ?? '',
    imgWriterSecret: '',

    
    acClientConfigSecret: '',

    
    acMarketplaceToken: '',

    
    acAcademyAiToken: '',

    
    stripeSecretKey: '',
    stripeWebhookSecret: '',

    
    
    instagramToken:    '',
    instagramIgUserId: process.env.NUXT_INSTAGRAM_IG_USER_ID ?? '',
    
    
    
    
    
    instagramAppId:     process.env.NUXT_INSTAGRAM_APP_ID ?? '',
    instagramAppSecret: '',

    
    
    
    
    
    
    
    backupS3Prefix: process.env.NUXT_BACKUP_S3_PREFIX ?? '',
    scwAccessKey: '',
    scwSecretKey: '',
    scwRegion:    process.env.AWS_DEFAULT_REGION ?? 'fr-par',
    scwEndpoint:  process.env.AWS_ENDPOINT_URL_S3 ?? 'https://s3.fr-par.scw.cloud',
    scwBucket:    process.env.SCW_BUCKET ?? 'ac-db-backups',

    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api',
      
      
      psFrontUrl: process.env.NUXT_PUBLIC_PS_FRONT_URL ?? PS_FRONT_URL_SENTINEL,
      clientId: process.env.NUXT_PUBLIC_CLIENT_ID ?? 'codemyshop',

      
      brandName: process.env.NUXT_PUBLIC_BRAND_NAME ?? 'Boutique',
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL ?? '',
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL ?? '',
      ownerName: process.env.NUXT_PUBLIC_OWNER_NAME ?? '',
      ownerAvatar: process.env.NUXT_PUBLIC_OWNER_AVATAR ?? '',
      favicon: process.env.NUXT_PUBLIC_FAVICON ?? '/favicon.svg',

      
      
      
      
      
      
      
      
      displayTimeZone: process.env.NUXT_PUBLIC_DISPLAY_TIMEZONE ?? '',

      
      b2bMode: process.env.NUXT_PUBLIC_B2B_MODE === 'true',
      commerceMode: (process.env.NUXT_PUBLIC_COMMERCE_MODE as 'b2c' | 'b2b' | 'dual') || (process.env.NUXT_PUBLIC_B2B_MODE === 'true' ? 'b2b' : 'b2c'),
      catalogueIndexable: process.env.NUXT_PUBLIC_CATALOGUE_INDEXABLE === 'true',
      
      
      
      sitemapProductLocales: (process.env.NUXT_PUBLIC_SITEMAP_PRODUCT_LOCALES ?? '')
        .split(',')
        .map(locale => locale.trim())
        .filter(Boolean),
      
      
      
      
      facetedNav: process.env.NUXT_PUBLIC_FACETED_NAV === 'true',

      
      
      
      
      
      
      
      
      
      
      plateSearch: process.env.NUXT_PUBLIC_PLATE_SEARCH === 'true',

      
      
      
      
      
      plateCountry: process.env.NUXT_PLATE_API_COUNTRY ?? 'FR',
      
      
      plateCountries: process.env.NUXT_PLATE_API_COUNTRIES ?? '',

      pwaEnabled: process.env.NUXT_PUBLIC_PWA_ENABLED === 'true',
      pwaName: process.env.NUXT_PUBLIC_PWA_NAME ?? '',
      pwaShortName: process.env.NUXT_PUBLIC_PWA_SHORT_NAME ?? '',
      pwaThemeColor: process.env.NUXT_PUBLIC_PWA_THEME_COLOR ?? '#ffffff',
      pwaBackgroundColor: process.env.NUXT_PUBLIC_PWA_BG_COLOR ?? '#ffffff',

      
      hubLoginUrl: process.env.NUXT_PUBLIC_HUB_LOGIN_URL ?? '',

      
      cmsVersion: process.env.NUXT_PUBLIC_CMS_VERSION ?? '0.2.8',
    },
  },

  
  
  
  
  
  
  routeRules: {
    '/hub/**': { ssr: false, ...DOC_NO_CACHE },
    '/hub':    { ssr: false, ...DOC_NO_CACHE },
    
    
    
    
    '/_ipx/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
    
    
    '/_fonts/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

    
    '/**': { ...SSR_CACHE },

    
    '/api/**':   { ...NO_CACHE },
    '/_nuxt/**': { ...NO_CACHE },
    '/_ipx/**':  { headers: { 'cache-control': 'public, max-age=31536000, immutable' }, ...NO_CACHE },
    '/_fonts/**':{ headers: { 'cache-control': 'public, max-age=31536000, immutable' }, ...NO_CACHE },
    
    
    
    
    
    
    
    
    '/img/**':   { headers: { 'cache-control': 'public, max-age=31536000, immutable' }, ...NO_CACHE },
    
    
    
    '/google-merchant.xml': { ...NO_CACHE },
    
    
    
    '/commande-confirmee': { ...NO_CACHE },

    
    
    
    
    
    
    
    
    '/.well-known/oauth-authorization-server': { ...NO_CACHE },
    '/.well-known/oauth-protected-resource':   { ...NO_CACHE },
    '/mcp':    { ...NO_CACHE },
    '/mcp/**': { ...NO_CACHE },
    
    
    
    
    
    
    
    
    
    
    
    '/oauth/**': { ...NO_CACHE },

    
    
    
    ...Object.fromEntries(HOST_DEPENDENT_ROUTES.map((route) => [route, { ...NO_CACHE }])),

    
    
    
    ...STATEFUL_DENY,

    
    
    '/': SSR_CACHE_HOMEPAGE ? { ...SSR_CACHE } : { ...DOC_NO_CACHE },

    
    
    '/blog/**':         { swr: 300, cache: { base: 'redis' } },
    '/marques/**':      { swr: 300, cache: { base: 'redis' } },
    '/auteur/**':       { swr: 300, cache: { base: 'redis' } },
    '/dictionnaire/**': { swr: 600, cache: { base: 'redis' } },
    '/expertise/**':    { swr: 600, cache: { base: 'redis' } },
    '/page/**':         { swr: 600, cache: { base: 'redis' } },
    '/cgv':             { swr: 3600, cache: { base: 'redis' } },
    '/mentions-legales':{ swr: 3600, cache: { base: 'redis' } },
    '/cookies':         { swr: 3600, cache: { base: 'redis' } },

    
    ...DENY_EXTRA,
  },

  hooks: {
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    'nitro:config': (nitroConfig: any) => {
      prependErrorHandler(nitroConfig, resolve(__layerDir, 'server/error-status-message'))
    },
    
    
    
    
    
    
    
    'build:manifest': (manifest) => {
      for (const key in manifest) manifest[key]!.prefetch = false
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    
    
    
    
    
    
    compressPublicAssets: { gzip: true, brotli: true },
    storage: {
      
      
      
      
      
      
      
      
      
      avatars:   { driver: 'fs', base: resolve(__layerDir, 'server/data/avatars') },
      automates: { driver: 'fs', base: resolve(__layerDir, 'server/data/automates') },
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      redis: {
        driver: 'memory',
      },
    },
    alias: {
      '~/server':      resolve(__layerDir, 'server'),
      '~/types':       resolve(__layerDir, 'types'),
      '~/utils':       resolve(__layerDir, 'utils'),
      '~/config':      resolve(__layerDir, 'config'),
      '~/composables': resolve(__layerDir, 'composables'),
      '~/enterprise/base':             resolve(__layerDir, '..', 'enterprise/base/modules'),
      '~/enterprise/ai':               resolve(__layerDir, '..', 'enterprise/ai/modules'),
      '~/enterprise/data':             resolve(__layerDir, '..', 'enterprise/data/modules'),
      '~/enterprise/seo':              resolve(__layerDir, '..', 'enterprise/seo/modules'),
      '~/enterprise/banking':          resolve(__layerDir, '..', 'enterprise/banking/modules'),
      '~/enterprise/vertical-food':    resolve(__layerDir, '..', 'enterprise/vertical-food/modules'),
      '~/enterprise/vertical-vape':    resolve(__layerDir, '..', 'enterprise/vertical-vape/modules'),
      '~/enterprise/vertical-fashion': resolve(__layerDir, '..', 'enterprise/vertical-fashion/modules'),
      '~/enterprise/vertical-jewelry': resolve(__layerDir, '..', 'enterprise/vertical-jewelry/modules'),
      '~/enterprise/misc':             resolve(__layerDir, '..', 'enterprise/misc/modules'),
      '~/enterprise':   resolve(__layerDir, '..', 'enterprise'),
      '~/internal':     resolve(__layerDir, '../..', 'mothership-app/modules'),
    },
    
    
    
    
    moduleSideEffects: [
      ...serverSideEffectEntries(resolve(__layerDir, '..')),
      
      
      PRIME_SECRET_ENV,
    ],
    
    
    
    
    
    unenv: { polyfill: [PRIME_SECRET_ENV] },
    scheduledTasks: {
      
      
      
      
      
      '30 4 * * *': ['audit:schema-watch'],
      
      
      
      '0 8 * * *': ['audit:sitemap-watch'],
      
      
      
      
      '15 20 * * *': ['audit:dictionary-watch'],
      
      
      
      
      
      '45 7 * * *': ['audit:blog-hygiene'],
      
      
      
      
      
      
      '10 8 * * *': ['audit:pageaudit'],
      
      
      
      
      
      
      
      '50 7 * * *': ['audit:factcheck'],
      
      
      
      
      
      
      '15 7 * * *': ['audit:brand-watch'],
      
      
      
      
      
      
      
      '1-59/3 * * * *': ['audit:uptime-monitor'],
      
      
      
      
      
      
      
      '1-59/5 * * * *': ['cover:queue-process'],
      
      
      
      
      
      
      
      
      
      
      '50 3 * * *': ['business:expiry-discounts'],
      
      
      
      
      
      '15 2 * * 4': ['audit:deps-watch'],
      
      
      
      
      
      '15 * * * *': ['cover:carousel-process'],
      
      
      
      
      
      
      '5 4 * * *': ['seo:crosslinks-rebuild'],
      
      
      
      
      
      
      '35 4 * * *': ['facet:family-map'],
      
      
      
      
      
      
      
      '30 6 * * *': ['audit:ssl-watch'],
      
      
      
      
      
      
      
      
      
      '0 5 * * 1-6': ['audit:daily-meet'],
      
      
      
      
      
      
      
      
      '*/5 * * * *': ['inbox:sync'],
      
      
      
      
      
      '* * * * *': ['email:queue-process'],
      
      
      
      
      '2-59/5 * * * *': ['email:client-sync'],
    },
  },
})
