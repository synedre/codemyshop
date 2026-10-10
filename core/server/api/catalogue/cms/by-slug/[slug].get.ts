

import { useClientDb, useClientDbById } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import {
  loadCmsCategoryTree, resolveCmsCategoryIdByPath, isFlatServedCategory,
  cmsCategoryTrail, cmsTrailServedPaths,
} from '~/server/utils/cms-path'
import { expandShippingRatesMarker } from '~/server/utils/shipping-rate-table'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw createError({ statusCode: 400, message: 'Slug invalide' })
  }

  const { clientId, parent } = getQuery(event)
  const parentSegments = String(parent ?? '').split('/').filter(Boolean)
  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    const tree = await loadCmsCategoryTree(db, idLang)

    let idCmsCategory: number | null = null
    if (parentSegments.length) {
      idCmsCategory = resolveCmsCategoryIdByPath(tree, parentSegments)
      if (!idCmsCategory) throw createError({ statusCode: 404, message: 'Page CMS introuvable' })
    }

    const row = await db.get<{
      id_cms: number
      id_cms_category: number
      meta_title: string
      head_seo_title: string
      meta_description: string
      content: string
      link_rewrite: string
    }>(
      `SELECT c.id_cms, c.id_cms_category,
              cl.meta_title,
              cl.head_seo_title,
              cl.meta_description,
              cl.content,
              cl.link_rewrite
         FROM ps_cms c
         JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
        WHERE c.active = 1
          AND cl.link_rewrite = ?
          ${idCmsCategory ? 'AND c.id_cms_category = ?' : ''}
        LIMIT 1`,
      idCmsCategory ? [idLang, slug, idCmsCategory] : [idLang, slug],
    )
    if (!row) throw createError({ statusCode: 404, message: 'Page CMS introuvable' })

    
    
    if (!parentSegments.length && !isFlatServedCategory(tree, Number(row.id_cms_category))) {
      throw createError({ statusCode: 404, message: 'Page CMS introuvable' })
    }

    
    
    
    
    const trailSteps = cmsCategoryTrail(tree, Number(row.id_cms_category))
    const servedPaths = await cmsTrailServedPaths(db, idLang, tree, trailSteps)

    return {
      id: Number(row.id_cms),
      slug: String(row.link_rewrite || slug),
      title: String(row.meta_title || ''),
      
      
      
      
      
      
      
      
      h1: String(row.head_seo_title || row.meta_title || ''),
      
      
      content: await expandShippingRatesMarker(String(row.content || ''), db as any, idLang),
      meta_description: String(row.meta_description || ''),
      trail: trailSteps.map((step) => ({
        name: step.name,
        
        
        
        href: servedPaths.has(step.path) ? `/${step.path}` : null,
      })),
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      throw createError({ statusCode: 404, message: 'Page CMS introuvable' })
    }
    console.error('[catalogue/cms/by-slug] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement CMS' })
  }
})
