

import { buildMegamenuColumns, type MegamenuApiItem } from '~/utils/megamenu-columns'
import { resolveActiveContext } from '~/utils/menu-context'
import { navItemCssStyle, resolveNavEmphasis } from '~/utils/nav-item-emphasis'

interface ApiMenuContext {
  key: string
  label: string | Record<string, string>
  position: number
  
  searchRootCategoryId?: number | null
  topbarMessage?: string | Record<string, string> | null
  topbarMessageMobile?: string | Record<string, string> | null
}

type ApiMegamenuItem = MegamenuApiItem

function apiItemToHeaderFormat(root: ApiMegamenuItem): Record<string, any> {
  const item: Record<string, any> = {
    label: root.label,
    href: root.href,
    
    
    barVisible: root.barVisible !== false,
  }

  
  
  if (root.icon) item.icon = root.icon

  
  if (root.badge) item.badge = root.badge
  if (root.style?.badgeBg) item.badgeBg = root.style.badgeBg
  if (root.style?.badgeColor) item.badgeColor = root.style.badgeColor

  if (root.style) {
    item.bgColor = root.style.backgroundColor
    item.textColor = root.style.color
    
    
    
    
    if ((root.style as any).highlight) {
      item.highlight = (root.style as any).highlight === 'solid' ? 'solid' : true
    }
    
    
    
    
    const emphasis = resolveNavEmphasis(root.style)
    if (emphasis) item.emphasis = emphasis

    item.style = navItemCssStyle(root.style)
  }

  if (root.cssClass?.includes('ml-auto')) {
    item.rightAlign = true
    item.align = 'right'
  }

  if (root.type === 'megamenu' && root.children.length) {
    item.isMegaMenu = true
    
    
    const { columns, universeTree } = buildMegamenuColumns(root)
    
    
    item.universeTree = universeTree
    item.megaMenu = columns
  } else if (root.type === 'dropdown' && (root.children.length || root.psChildren?.length)) {
    
    item.isMegaMenu = false

    
    const explicitLinks = root.children.map((sub) => ({
      label: sub.label,
      href: sub.href,
      psChildren: sub.psChildren?.length ? sub.psChildren.map(pc => ({
        label: { fr: pc.name },
        href: pc.href,
      })) : undefined,
      showPsChildren: sub.showPsChildren || false,
      psCategoryId: sub.psCategoryId || undefined,
    }))

    
    
    
    const hrefDepth = (root.href || '').replace(/^\/|\/$/g, '').split('/').filter(Boolean).length
    const showGrandchildren = hrefDepth >= 2
    const autoLinks = (root.psChildren || []).map(pc => ({
      label: { fr: pc.name },
      href: pc.href,
      psChildren: showGrandchildren && pc.psChildren?.length ? pc.psChildren.map((gc: any) => ({
        label: { fr: gc.name },
        href: gc.href,
      })) : undefined,
    }))

    const allLinks = [...explicitLinks, ...autoLinks]
    item.megaMenu = [{ links: allLinks }]
    item.children = allLinks
  }

  return item
}

export function useMegamenu() {
  const { activeLang } = useRouteLang()
  const { resolvedClientId } = useClientDetection()

  
  
  
  
  
  
  
  
  const context = useCookie<string>('menu_ctx', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
  })

  
  
  
  
  
  
  
  const { data: contextsData } = useFetch<{ contexts: ApiMenuContext[] }>(
    '/api/megamenu/contexts',
    {
      key: computed(() => `megamenu-contexts-${resolvedClientId.value}`),
      default: () => ({ contexts: [] }),
    },
  )
  const contexts = computed<ApiMenuContext[]>(() => contextsData.value?.contexts ?? [])

  
  
  
  const currentContext = computed(() =>
    resolveActiveContext(context.value, contexts.value.map(c => c.key))
  )

  

  const currentContextConfig = computed<ApiMenuContext | undefined>(() =>
    contexts.value.find(c => c.key === currentContext.value)
  )

  
  function setContext(key: string) {
    context.value = key
  }

  
  
  
  
  
  
  
  
  
  
  const { data, status } = useFetch<{ items: ApiMegamenuItem[] }>('/api/megamenu', {
    key: 'megamenu',
    query: computed(() => ({ lang: activeLang.value, context: currentContext.value })),
    watch: [activeLang, currentContext],
    default: () => ({ items: [] }),
  })

  
  const builderOverride = useState<Record<string, any>[] | null>('megamenu_builder_override', () => null)

  
  
  
  
  const lastGoodItems = useState<Record<string, any>[] | null>('megamenu_resolved', () => null)
  watch(
    () => data.value?.items,
    (items) => { if (items?.length) lastGoodItems.value = items.map(apiItemToHeaderFormat) },
    { immediate: true },
  )

  
  
  
  
  const dirty = useState<boolean>('megamenu_dirty', () => false)

  
  const menuItems = computed(() => {
    if (builderOverride.value?.length) return builderOverride.value
    if (data.value?.items?.length) return data.value.items.map(apiItemToHeaderFormat)
    
    if (lastGoodItems.value?.length) return lastGoodItems.value
    return []
  })

  
  function loadIntoBuilder() {
    if (data.value?.items?.length) {
      builderOverride.value = data.value.items.map(apiItemToHeaderFormat)
    } else {
      builderOverride.value = []
    }
    dirty.value = false
  }

  
  function setBuilderItems(items: Record<string, any>[]) {
    builderOverride.value = [...items]
    dirty.value = true
  }

  
  async function syncToDb() {
    const items = builderOverride.value
    if (!items) return
    await $fetch('/api/megamenu/sync', {
      method: 'PUT',
      body: { items },
    })
    
    await refreshNuxtData('megamenu')
    
    
    
    if (data.value?.items?.length) {
      builderOverride.value = data.value.items.map(apiItemToHeaderFormat)
    }
    dirty.value = false
  }

  
  function clearBuilderOverride() {
    builderOverride.value = null
    dirty.value = false
  }

  return {
    menuItems,
    status,
    builderOverride,
    dirty,
    loadIntoBuilder,
    setBuilderItems,
    syncToDb,
    clearBuilderOverride,
    
    context,
    contexts,
    currentContext,
    currentContextConfig,
    setContext,
  }
}
