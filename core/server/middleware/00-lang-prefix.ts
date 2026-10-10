

import { retiredLocaleOfPath, resolveRetiredTarget } from '~/server/utils/i18n-retired'

const LANG_PREFIX_RE = /^\/([a-z]{2})(\/.*)?$/

const KNOWN_LANGS = new Set([
  'fr', 'en', 'de', 'es', 'it', 'nl', 'pt',
  'ar', 'zh', 'ja', 'ko', 'ru', 'pl', 'tr',
])

const RESERVED_PREFIXES = new Set(['bo', 'ma'])

const LEGACY_PRODUCT_WITH_LANG_RE = /^\/([a-z]{2})\/(\d+)-[^/]+\.html$/
const LEGACY_CATEGORY_WITH_LANG_RE = /^\/([a-z]{2})\/(\d+)-[^/]+\/?$/
const LEGACY_BLOG_WITH_LANG_RE     = /^\/([a-z]{2})\/blog\/(\d+)_[^/]+\.html$/

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  
  if (path.startsWith('/_nuxt/') || path.startsWith('/__nuxt')) {
    return
  }

  const match = path.match(LANG_PREFIX_RE)
  if (!match) return

  const lang = match[1]
  const rest = match[2] || '/'

  if (!KNOWN_LANGS.has(lang) || RESERVED_PREFIXES.has(lang)) return

  
  
  
  
  
  const pub = useRuntimeConfig(event).public as any
  const retiredIso = path.startsWith('/api/') ? null : retiredLocaleOfPath(path, pub)
  if (retiredIso) {
    const target = await resolveRetiredTarget(event, path, retiredIso, pub)
    if (!target) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    return sendRedirect(event, target + url.search, 301)
  }

  
  
  
  
  
  const defaultLocale = ((useRuntimeConfig(event).public as any)?.i18nDefaultLocale as string) || 'fr'
  if (lang === defaultLocale) {
    
    
    
    
    
    if (
      LEGACY_PRODUCT_WITH_LANG_RE.test(path) ||
      LEGACY_BLOG_WITH_LANG_RE.test(path) ||
      LEGACY_CATEGORY_WITH_LANG_RE.test(path)
    ) {
      return
    }
    
    
    
    
    
    
    event.context._rootPrefixStrip = rest + url.search
    return
  }

  
  
  event.context._langPrefix = lang

  
  
  if (path.startsWith('/api/')) {
    const existingSearch = url.search
    if (!existingSearch.includes('lang=')) {
      const langQuery = `lang=${lang}`
      const newSearch = existingSearch
        ? `${existingSearch}&${langQuery}`
        : `?${langQuery}`
      event.node.req.url = rest + newSearch
    }
  }
})
