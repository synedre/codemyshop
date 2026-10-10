

import { localizePath } from '~/utils/localize-path'
import { PIVOT_LOCALE } from '~/utils/i18n-root-locale'

export function useLocalePath() {
  const { activeLang } = useRouteLang()
  const { maps } = useRootSegments()
  const config = useRuntimeConfig()
  const defaultLocale = String((config.public as any).i18nDefaultLocale || 'fr')
  const locales: string[] = ((config.public as any).i18nLocales as string[]) || ['en']
  function localePath(path: string | null | undefined): string {
    const lang = activeLang.value
    return localizePath(path, {
      lang,
      defaultLocale,
      
      
      
      
      sourceLocale: PIVOT_LOCALE,
      locales,
      
      
      
      paths: maps.value.paths?.[lang],
      roots: maps.value.translations?.[lang],
    })
  }

  return { localePath, activeLang }
}
