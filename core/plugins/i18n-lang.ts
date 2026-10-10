

import { estRouteHubConnecte, langueActive } from '~/utils/hub-lang'

export default defineNuxtPlugin(() => {
  const { activeLang: routeLang } = useRouteLang()
  const route = useRoute()
  
  
  const employeeLang = useState<string | null>('hub_employee_lang', () => null)
  const activeLang = useState<string>('active_lang', () => langueActive(route.path, employeeLang.value, routeLang.value))

  const appliquer = () => { activeLang.value = langueActive(route.path, employeeLang.value, routeLang.value) }
  
  
  watch([routeLang, () => route.path, employeeLang], appliquer)

  if (import.meta.client) {
    let lue = false
    const lire = async () => {
      if (lue || !estRouteHubConnecte(route.path)) return
      lue = true
      try {
        const r = await $fetch<{ iso: string | null }>('/api/hub/employee/lang')
        employeeLang.value = r?.iso || null
      } catch {  }
    }
    lire()
    watch(() => route.path, lire)
  }

  
  useHead({
    htmlAttrs: { lang: activeLang },
  })
})
