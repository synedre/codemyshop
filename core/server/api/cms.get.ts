

import { stripHtml } from '~/server/utils/ps'
import { articleHasContentSql, articleHasOwnContentSql } from '~/server/utils/article-publishable'
import { readShopConfigValue } from '~/server/utils/shop-config'
import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { loadBlogTree, blogBranchIds } from '~/server/utils/blog-tree'
import { blogArticleUrl, blogRelativePath } from '~/server/utils/blog-path'
import { toIsoDateTime } from '~/server/utils/pg-date'

export default defineEventHandler(async (event) => {
  const { limit = '20', category = '' } = getQuery(event)

  try {
    const db = useClientDb(event)
    const idLang = await resolveIdLang(event)

    
    
    const { tree, rootId } = await loadBlogTree(db, idLang)

    
    let hasExtraTable = false
    try {
      await db.query('SELECT 1 FROM cs_cms_extra LIMIT 0')
      hasExtraTable = true
    } catch {  }

    
    let hasCoverQueue = false
    try {
      await db.query('SELECT 1 FROM cs_covergen_queue LIMIT 0')
      hasCoverQueue = true
    } catch {  }

    
    
    
    
    
    
    let hasCmsDates = true
    try {
      await db.query('SELECT date_add FROM ps_cms LIMIT 0')
    } catch { hasCmsDates = false }

    const coverSelect = hasCoverQueue
      ? `, COALESCE((SELECT cq.cover_url FROM cs_covergen_queue cq WHERE cq.id_cms = c.id_cms AND cq.status = 'done' ORDER BY cq.id_covergen DESC LIMIT 1), '') as generated_cover`
      : `, '' as generated_cover`

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const ownLangOnly = (await readShopConfigValue(db, 'AC_BLOG_LIST_OWN_LANG_ONLY').catch(() => '')).trim() === '1'
    const contenuWhere = ownLangOnly ? articleHasOwnContentSql('cl') : articleHasContentSql('cl', 'cld')
    const eligibleWhere = `c.active = 1 AND (ccl.link_rewrite IS NOT NULL OR cl.link_rewrite LIKE '%--%--%') AND ${contenuWhere}`

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const datePubExpr = hasCmsDates ? 'COALESCE(ex.date_published, c.date_add)' : 'ex.date_published'
    const dateUpdExpr = hasCmsDates ? 'COALESCE(ex.date_updated, c.date_upd)' : 'ex.date_updated'
    const dateColsExpr = hasCmsDates
      ? 'c.date_add AS date_published, c.date_upd AS date_updated'
      : 'NULL::timestamptz AS date_published, NULL::timestamptz AS date_updated'
    let sql = hasExtraTable
      ? `SELECT c.id_cms, c.id_cms_category, c.indexation,
               COALESCE(NULLIF(cl.meta_title, ''), cld.meta_title) AS meta_title,
               COALESCE(NULLIF(cl.meta_description, ''), cld.meta_description) AS meta_description,
               COALESCE(NULLIF(cl.content, ''), cld.content) AS content,
               cl.link_rewrite,
               COALESCE(ccl.link_rewrite, '') AS pillar_slug,
               ${datePubExpr} AS date_published,
               ${dateUpdExpr} AS date_updated
               ${coverSelect}
         FROM ps_cms c
         JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
         LEFT JOIN ps_cms_lang cld ON cld.id_cms = c.id_cms AND cld.id_lang = 1
         LEFT JOIN ps_cms_category pcat ON pcat.id_cms_category = c.id_cms_category AND pcat.id_parent NOT IN (0, 1)
         LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = pcat.id_cms_category AND ccl.id_lang = ?
         LEFT JOIN cs_cms_extra ex ON ex.id_cms = c.id_cms
         WHERE ${eligibleWhere}`
      : `SELECT c.id_cms, c.id_cms_category, c.indexation,
               COALESCE(NULLIF(cl.meta_title, ''), cld.meta_title) AS meta_title,
               COALESCE(NULLIF(cl.meta_description, ''), cld.meta_description) AS meta_description,
               COALESCE(NULLIF(cl.content, ''), cld.content) AS content,
               cl.link_rewrite,
               COALESCE(ccl.link_rewrite, '') AS pillar_slug,
               ${dateColsExpr}
               ${coverSelect}
         FROM ps_cms c
         JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
         LEFT JOIN ps_cms_lang cld ON cld.id_cms = c.id_cms AND cld.id_lang = 1
         LEFT JOIN ps_cms_category pcat ON pcat.id_cms_category = c.id_cms_category AND pcat.id_parent NOT IN (0, 1)
         LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = pcat.id_cms_category AND ccl.id_lang = ?
         WHERE ${eligibleWhere}`
    const params: any[] = [idLang, idLang]

    if (category) {
      
      
      
      
      
      
      
      
      
      
      
      const segments = String(category).split('/').filter(Boolean)
      const branche = rootId !== null ? blogBranchIds(tree, rootId, segments.join('/')) : []
      
      
      if (branche.length) {
        sql += ` AND (c.id_cms_category IN (${branche.map(() => '?').join(',')}) OR cl.link_rewrite LIKE ?)`
        params.push(...branche, `${segments.join('--')}--%`)
      } else {
        sql += ' AND (ccl.link_rewrite = ? OR cl.link_rewrite LIKE ?)'
        params.push(String(category), `${category}--%`)
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    sql += ' ORDER BY date_published DESC, c.id_cms DESC'

    if (Number(limit) > 0) {
      sql += ' LIMIT ?'
      params.push(Number(limit))
    }

    const rows = await db.query(sql, params)

    
    
    
    
    
    
    
    const coverByCms = new Map<number, string>()
    try {
      const ids = (rows as any[]).map(r => Number(r.id_cms)).filter(n => n > 0)
      if (ids.length) {
        const qrows = await db.query(
          `SELECT id_cms, cover_url FROM cs_covergen_queue WHERE status = 'done' AND id_cms IN (${ids.map(() => '?').join(',')}) ORDER BY id_covergen ASC`,
          ids,
        )
        for (const c of (qrows as any[]) || []) {
          if (c?.cover_url) coverByCms.set(Number(c.id_cms), String(c.cover_url))
        }
      }
    } catch {  }

    return rows.map((r: any) => {
      const linkRewrite = r.link_rewrite || ''
      const rawContent = r.content || ''
      const metaDesc = r.meta_description || ''
      const parsed = parseSlug(linkRewrite)
      const slug = parsed.slug

      
      
      
      const catPath = rootId !== null
        ? blogRelativePath(tree, rootId, Number(r.id_cms_category))
        : null

      
      
      
      const segment = linkRewrite.split('--').filter(Boolean).pop() || linkRewrite

      const legacyParts = linkRewrite.split('--')
      const catSegments = catPath ? catPath.split('/') : []
      const category = catPath ? catSegments[0] : (r.pillar_slug || parsed.category)
      const subcategory = catPath
        ? (catSegments[1] || '')
        : (legacyParts.length >= 3 ? legacyParts[1] : '')

      
      
      
      
      
      
      const nuxtUrl = blogArticleUrl(tree, rootId, Number(r.id_cms_category), linkRewrite)
      const path = nuxtUrl.replace(/^\/blog\/?/, '')

      const coverImage = extractCoverImage(rawContent) || r.generated_cover || coverByCms.get(Number(r.id_cms)) || ''
      const plainText = stripHtml(rawContent)
      const wordCount = plainText.split(/\s+/).filter(Boolean).length
      const faqCount = (rawContent.match(/<dt[\s>]/gi) || []).length

      return {
        id: r.id_cms,
        title: r.meta_title || '',
        category,
        subcategory,
        slug,
        
        segment,
        

        categoryPath: catPath || '',
        

        path,
        linkRewrite,
        excerpt: metaDesc || plainText.slice(0, 160),
        coverImage,
        thumbnailImage: deriveThumbnail(coverImage),
        

        nuxtUrl,
        
        indexable: Number(r.indexation ?? 1) !== 0,
        datePublished: toIsoDateTime(r.date_published),
        dateUpdated: toIsoDateTime(r.date_updated),
        readingTime: Math.max(1, Math.round(wordCount / 200)),
        faqCount,
      }
    })
  } catch (err: any) {
    console.error('[API cms] DB error:', err.message)
    return []
  }
})

function extractCoverImage(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : ''
}

function deriveThumbnail(coverUrl: string): string {
  if (!coverUrl) return ''
  const filename = coverUrl.split('/').pop() ?? ''
  if (!filename.startsWith('cover-')) return coverUrl
  return coverUrl.replace(/\/cover-/, '/thumb-')
}

function parseSlug(linkRewrite: string) {
  const sep = linkRewrite.indexOf('--')
  if (sep === -1) return { category: '', slug: linkRewrite }
  return { category: linkRewrite.slice(0, sep), slug: linkRewrite.slice(sep + 2) }
}
