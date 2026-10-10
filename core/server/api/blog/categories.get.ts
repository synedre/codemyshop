

import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

export interface BlogPillarNode {
  id: number
  key: string
  

  keyFr: string
  name: string
  description: string
  metaTitle: string
  metaDescription: string
  position: number
  subcategories: BlogSubcategoryNode[]
}

export interface BlogSubcategoryNode {
  id: number
  key: string
  keyFr: string
  name: string
  description: string
  metaTitle: string
  metaDescription: string
  position: number
}

export interface BlogCategoriesResponse {
  
  rootId: number | null
  pillars: BlogPillarNode[]
}

export default defineEventHandler(async (event): Promise<BlogCategoriesResponse> => {
  try {
    const db = useClientDb(event)
    
    
    const idLang = await resolveIdLang(event)

    const blogRoot = await db.query(
      `SELECT c.id_cms_category
       FROM ps_cms_category c
       JOIN ps_cms_category_lang cl ON c.id_cms_category = cl.id_cms_category AND cl.id_lang = 1
       WHERE cl.link_rewrite = 'blog' AND c.active = 1
       LIMIT 1`,
    )

    if (!blogRoot.length) return { rootId: null, pillars: [] }

    const rootId = blogRoot[0].id_cms_category

    const pillars = await db.query(
      `SELECT c.id_cms_category, c.position,
              COALESCE(cl.name, cfr.name) AS name,
              COALESCE(cl.description, cfr.description) AS description,
              COALESCE(cl.link_rewrite, cfr.link_rewrite) AS link_rewrite,
              cfr.link_rewrite AS link_rewrite_fr,
              COALESCE(cl.meta_title, cfr.meta_title) AS meta_title,
              COALESCE(cl.meta_description, cfr.meta_description) AS meta_description
       FROM ps_cms_category c
       JOIN ps_cms_category_lang cfr ON c.id_cms_category = cfr.id_cms_category AND cfr.id_lang = 1
       LEFT JOIN ps_cms_category_lang cl ON c.id_cms_category = cl.id_cms_category AND cl.id_lang = ?
       WHERE c.id_parent = ? AND c.active = 1
       ORDER BY c.position, c.id_cms_category`,
      [idLang, rootId],
    )

    if (!pillars.length) return { rootId, pillars: [] }

    const pillarIds = pillars.map((p: any) => p.id_cms_category)
    const placeholders = pillarIds.map(() => '?').join(',')

    const subcats = await db.query(
      `SELECT c.id_cms_category, c.id_parent, c.position,
              COALESCE(cl.name, cfr.name) AS name,
              COALESCE(cl.description, cfr.description) AS description,
              COALESCE(cl.link_rewrite, cfr.link_rewrite) AS link_rewrite,
              cfr.link_rewrite AS link_rewrite_fr,
              COALESCE(cl.meta_title, cfr.meta_title) AS meta_title,
              COALESCE(cl.meta_description, cfr.meta_description) AS meta_description
       FROM ps_cms_category c
       JOIN ps_cms_category_lang cfr ON c.id_cms_category = cfr.id_cms_category AND cfr.id_lang = 1
       LEFT JOIN ps_cms_category_lang cl ON c.id_cms_category = cl.id_cms_category AND cl.id_lang = ?
       WHERE c.id_parent IN (${placeholders}) AND c.active = 1
       ORDER BY c.position, c.id_cms_category`,
      [idLang, ...pillarIds],
    )

    const subsByParent = new Map<number, BlogSubcategoryNode[]>()
    for (const s of subcats) {
      const node: BlogSubcategoryNode = {
        id: s.id_cms_category,
        key: s.link_rewrite,
        keyFr: s.link_rewrite_fr,
        name: s.name,
        description: s.description || '',
        metaTitle: s.meta_title || '',
        metaDescription: s.meta_description || '',
        position: s.position,
      }
      const arr = subsByParent.get(s.id_parent) || []
      arr.push(node)
      subsByParent.set(s.id_parent, arr)
    }

    return {
      rootId,
      pillars: pillars.map((p: any) => ({
        id: p.id_cms_category,
        key: p.link_rewrite,
        keyFr: p.link_rewrite_fr,
        name: p.name,
        description: p.description || '',
        metaTitle: p.meta_title || '',
        metaDescription: p.meta_description || '',
        position: p.position,
        subcategories: subsByParent.get(p.id_cms_category) || [],
      })),
    }
  } catch (err: any) {
    console.error('[API blog/categories] DB error:', err.message)
    return { rootId: null, pillars: [] }
  }
})
