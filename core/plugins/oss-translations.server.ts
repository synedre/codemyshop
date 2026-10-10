

export default defineNuxtPlugin(async (nuxtApp) => {
  const translations = useState<Record<string, string>>('oss_translations', () => ({}))
  const loaded = useState<boolean>('oss_translations_loaded', () => false)

  if (loaded.value) return

  const runtimeConfig = useRuntimeConfig()
  const clientId = (runtimeConfig.clientId as string) || (runtimeConfig.public?.clientId as string) || 'codemyshop'

  
  
  
  
  
  
  
  
  
  
  
  
  
  const { activeLang } = useRouteLang()
  const lang = activeLang.value

  useState<string>('active_lang', () => lang)

  
  
  
  
  
  
  
  
  const scope = isHubPath(useRoute().path) ? 'full' : 'public'
  useState<string>('translations_scope', () => scope)

  try {
    const data = await $fetch<Record<string, string>>('/api/translations', {
      query: { lang, clientId, scope },
    })
    translations.value = data || {}
    
    
    useState<string | null>('oss_translations_lang', () => null).value = lang
    loaded.value = true
    if (scope === 'public') nuxtApp.hook('app:rendered', ctx => keepOnlyUsedKeys(nuxtApp, ctx))
  } catch (err: any) {
    console.error('[oss-translations.server] SSR preload failed:', err?.message || err)
    loaded.value = true
  }
})

function isHubPath(path: string): boolean {
  return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?hub(?:\/|$)/i.test(path)
}

export async function keepOnlyUsedKeys(
  nuxtApp: { payload: { state: Record<string, unknown> } },
  ctx: { ssrContext?: { head?: { resolveTags(): Promise<unknown> } }; islandContext?: unknown },
): Promise<void> {
  if (ctx.islandContext) return
  const state = nuxtApp.payload.state
  const full = state.$soss_translations as Record<string, string> | undefined
  
  if (!full || typeof full !== 'object') return
  try {
    
    
    
    
    
    await ctx.ssrContext?.head?.resolveTags()
  } catch (err: any) {
    console.error('[oss-translations.server] head non résolu, dictionnaire complet servi:', err?.message || err)
    return
  }
  state.$soss_translations = pickTranslations(full, translationKeysUsed(nuxtApp) ?? [])
  state.$soss_translations_partial = true
}
