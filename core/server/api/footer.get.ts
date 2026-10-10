

import { resolveClientId } from '~/server/utils/db'
import { loadSiloSlugMapForLang, localizeSiloHref } from '~/server/utils/localize-silo-href'
import { chargerContexteHrefsBlog, estHrefBlog, localiserHrefBlog } from '~/server/utils/blog-href-localize'
import { chargerSlugsCms, localiserHrefCms } from '~/server/utils/cms-href-localize'
import { listLinksWithLang } from '~/modules/footer/server/utils/footer'

const lastGoodFooter = new Map<string, any[]>()

export default defineEventHandler(async (event) => {
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)
  const clientId = resolveClientId(event)
  const cacheKey = `${clientId}:${idLang}`

  try {
    const slugMap = idLang !== 1 ? await loadSiloSlugMapForLang(idLang) : new Map<string, string>()
    
    const blogCtx = await chargerContexteHrefsBlog(useClientDb(event), idLang)
    
    const slugsCms = await chargerSlugsCms(useClientDb(event), idLang)

    const query = getQuery(event)
    const withIds = query.ids === '1'

    const rows = await listLinksWithLang(clientId, idLang, { event })

    
    
    
    
    const columnsMap = new Map<number, { title: string; position: number; links: any[] }>()
    for (const r of rows) {
      const pos = r.column_position
      if (!columnsMap.has(pos)) {
        columnsMap.set(pos, { title: r.column_title || '', position: pos, links: [] })
      }
      const link: any = {
        label: r.link_label || '',
        href: blogCtx && estHrefBlog(r.link_href)
          ? localiserHrefBlog(r.link_href, blogCtx)
          
          
          : localiserHrefCms(r.link_href, slugsCms)
            ?? (slugMap.size > 0 ? (localizeSiloHref(r.link_href, slugMap) || r.link_href) : r.link_href),
        badge: r.link_badge || undefined,
        external: r.link_external === 1,
      }
      if (withIds) {
        link.id = r.id_footer
        link.column_position = r.column_position
        link.link_position = r.link_position
      }
      columnsMap.get(pos)!.links.push(link)
    }

    const columns = [...columnsMap.values()]
    
    if (columns.length) lastGoodFooter.set(cacheKey, columns)
    return { columns }
  } catch (err: any) {
    console.error('[API footer] DB error:', err.message)
    const cached = lastGoodFooter.get(cacheKey)
    if (cached) return { columns: cached }
    return { columns: [], error: 'DB unavailable' }
  }
})
