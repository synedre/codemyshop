

import { getCmsArticleBySlug } from '~/modules/cms-extra/server/utils/cms-extra'
import { resolveIdLang } from '~/server/utils/lang'
import { toIsoDateTime } from '~/server/utils/pg-date'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug manquant' })
  }

  try {
    const idLang = await resolveIdLang(event)
    const item = await getCmsArticleBySlug(slug, idLang, { event })

    if (!item) {
      throw createError({ statusCode: 404, message: 'Article introuvable' })
    }

    return {
      id: item.id_cms,
      title: item.meta_title || '',
      
      
      h1: item.head_seo_title || item.meta_title || '',
      slug: item.link_rewrite || '',
      content: item.content || '',
      metaDescription: item.meta_description || '',
      layout: item.layout || null,
      coverImage: item.image || null,
      datePublished: toIsoDateTime(item.date_published) || null,
      dateUpdated: toIsoDateTime(item.date_updated) || null,
      active: true,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[API cms/slug] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur serveur' })
  }
})
