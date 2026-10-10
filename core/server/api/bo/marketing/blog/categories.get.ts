

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { buildBlogSlugPrefixMap } from '~/server/utils/blog-slug'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const categories = await db.query<any>(`
    SELECT
      c.id_cms_category   AS id,
      c.id_parent         AS parentId,
      c.level_depth       AS levelDepth,
      c.active,
      COALESCE(cl.name, CONCAT('Catégorie #', c.id_cms_category)) AS name
    FROM ps_cms_category c
    LEFT JOIN ps_cms_category_lang cl
      ON cl.id_cms_category = c.id_cms_category
     AND cl.id_lang = ?
     AND cl.id_shop = 1
    WHERE c.id_cms_category <> 1
    ORDER BY c.level_depth ASC, c.position ASC, c.id_cms_category ASC
  `, [langId])

  
  
  const prefixMap = await buildBlogSlugPrefixMap(db, categories.map((c: any) => Number(c.id)))
  for (const c of categories) {
    c.blogSlugPrefix = prefixMap.get(Number(c.id)) || ''
  }

  return { categories, langId }
})
