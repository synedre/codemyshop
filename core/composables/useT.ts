

export const useT = () => {
  const translations = useState<Record<string, string>>('oss_translations', () => ({}))
  const loaded = useState<boolean>('oss_translations_loaded', () => false)
  
  
  const recordKey = import.meta.server ? translationKeyRecorder(useNuxtApp()) : null

  async function load() {
    if (loaded.value) return
    try {
      const activeLang = useState<string>('active_lang', () => 'fr')
      const data = await $fetch<Record<string, string>>('/api/translations', {
        query: { lang: activeLang.value },
      })
      translations.value = data || {}
      loaded.value = true
    } catch {
      loaded.value = true
    }
  }

  

  function t(
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    maybeParams?: Record<string, string | number>,
  ): string {
    const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined
    const params =
      typeof fallbackOrParams === 'object' && fallbackOrParams !== null
        ? fallbackOrParams
        : maybeParams

    
    
    
    
    recordKey?.(key)
    const raw = (translations.value ?? {})[key] ?? fallback
    if (raw === undefined) {
      if (import.meta.dev) console.warn(`[useT] missing key: ${key}`)
      return key
    }
    if (!params) return raw
    return raw.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] !== undefined ? String(params[name]) : m,
    )
  }

  if (!loaded.value && import.meta.client) {
    load()
  }

  

  function prime(keys: readonly string[]): void {
    if (recordKey) for (const k of keys) recordKey(k)
  }

  return { t, translations, load, loaded, prime }
}
