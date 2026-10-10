

import { stripHtml } from '~/server/utils/ps'
import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { loadBlogTree } from '~/server/utils/blog-tree'
import { blogArticleUrl, blogRelativePath } from '~/server/utils/blog-path'
import { toIsoDateTime } from '~/server/utils/pg-date'

export default defineEventHandler(async (event) => {
  const { q = '' } = getQuery(event)
  const query = String(q).trim().toLowerCase()

  if (query.length < 2) return []

  try {
    const db = useClientDb(event)
    
    
    const idLang = await resolveIdLang(event)
    const { tree, rootId } = await loadBlogTree(db, idLang)

    const wildcard = `%${query}%`
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    let hasExtraTable = false
    try {
      await db.query('SELECT 1 FROM cs_cms_extra LIMIT 0')
      hasExtraTable = true
    } catch {  }

    const dateSelect = hasExtraTable
      ? 'COALESCE(ex.date_published, c.date_add) AS date_add'
      : 'c.date_add'
    const extraJoin = hasExtraTable
      ? 'LEFT JOIN cs_cms_extra ex ON ex.id_cms = c.id_cms'
      : ''

    const rows = await db.query(
      `SELECT c.id_cms, c.id_cms_category,
              COALESCE(NULLIF(cl.meta_title, ''), cld.meta_title) AS meta_title,
              COALESCE(NULLIF(cl.meta_description, ''), cld.meta_description) AS meta_description,
              COALESCE(NULLIF(cl.content, ''), cld.content) AS content,
              cl.link_rewrite,
              ${dateSelect}
       FROM ps_cms c
       JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
       LEFT JOIN ps_cms_lang cld ON cld.id_cms = c.id_cms AND cld.id_lang = 1
       ${extraJoin}
       WHERE c.active = 1
         AND (cl.meta_title LIKE ? OR cl.meta_description LIKE ? OR cl.content LIKE ?
              OR cld.meta_title LIKE ? OR cld.meta_description LIKE ? OR cld.content LIKE ?)
       ORDER BY date_add DESC, c.id_cms DESC
       LIMIT 40`,
      [idLang, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard]
    )

    return rows
      .filter((r: any) => {
        
        
        
        if (rootId === null) return true
        return blogRelativePath(tree, rootId, Number(r.id_cms_category)) !== null
      })
      .slice(0, 20)
      .map((r: any) => {
        const linkRewrite = r.link_rewrite || ''
        const nuxtUrl = blogArticleUrl(tree, rootId, Number(r.id_cms_category), linkRewrite)
        const path = nuxtUrl.replace(/^\/blog\/?/, '')
        const segments = path.split('/').filter(Boolean)
        const plainText = stripHtml(r.content || '')

        return {
          id: r.id_cms,
          slug: segments[segments.length - 1] || linkRewrite,
          title: r.meta_title || '',
          category: segments[0] || '',
          subcategory: segments.length >= 3 ? segments[1] : '',
          excerpt: r.meta_description || plainText.slice(0, 160),
          
          path,
          nuxtUrl,
          datePublished: toIsoDateTime(r.date_add),
        }
      })
  } catch (err: any) {
    console.error('[API blog/search] DB error:', err.message)
    return []
  }
})
