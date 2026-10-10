

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { replaceFaqsForParent, upsertFaqTranslations } from '~/modules/faq/server/utils/faq'
import { upsertCmsExtra as upsertCmsExtraFacade } from '~/modules/cms-extra/server/utils/cms-extra'
import { slugifyBlog as slugify, buildBlogFullSlug, buildBlogSlugPrefix, isValidArticleSlugPrefix, upsertBlogRedirect, blogPurgePathsFromSlug } from '~/server/utils/blog-slug'
import { purgeSwrCache } from '~/server/utils/purge-swr-cache'

async function assertArticleCategoryDepth(db: any, categoryId: number): Promise<void> {
  const prefix = await buildBlogSlugPrefix(db, categoryId)
  if (isValidArticleSlugPrefix(prefix)) return
  const children = await db.query<any>(
    `SELECT l.name FROM ps_cms_category c
       JOIN ps_cms_category_lang l ON l.id_cms_category = c.id_cms_category AND l.id_lang = 1
      WHERE c.id_parent = ? AND c.active = 1
      ORDER BY c.position ASC, c.id_cms_category ASC`,
    [categoryId],
  )
  const names = (children as any[]).map((r) => String(r.name || '')).filter(Boolean)
  throw createError({
    statusCode: 422,
    message: names.length
      ? `Un article se range sous une sous-catégorie, pas sous un pilier — sinon son URL ne mène nulle part. Sous-catégories disponibles : ${names.join(', ')}.`
      : 'Un article se range sous une sous-catégorie, pas sous un pilier — sinon son URL ne mène nulle part. Cette catégorie n\'a aucune sous-catégorie : en créer une d\'abord.',
  })
}

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const rawId = getRouterParam(event, 'id')
  if (!rawId) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)

  const isNew = rawId === 'new' || Number(rawId) === 0

  
  
  
  const langFields = {
    meta_title: body.title !== undefined ? String(body.title || '') : undefined,
    head_seo_title: body.headSeoTitle !== undefined ? String(body.headSeoTitle || '') : undefined,
    meta_description: body.metaDescription !== undefined ? String(body.metaDescription || '') : undefined,
    content: body.content !== undefined ? String(body.content || '') : undefined,
  }

  
  if (isNew) {
    if (!isMaster) {
      throw createError({ statusCode: 400, message: 'Création autorisée uniquement en langue master (id_lang=1)' })
    }
    const title = langFields.meta_title || ''
    if (!title) throw createError({ statusCode: 422, message: 'Titre obligatoire' })

    const categoryId = Number(body.categoryId) || 0
    if (categoryId <= 0 || categoryId === 1) {
      throw createError({ statusCode: 422, message: 'Catégorie de blog obligatoire (≠ racine)' })
    }
    await assertArticleCategoryDepth(db, categoryId)

    
    
    const linkRewrite = await buildBlogFullSlug(db, categoryId, body.linkRewrite || title)
    if (!linkRewrite) throw createError({ statusCode: 422, message: 'URL obligatoire' })

    
    const dupCheck = await db.get<any>(
      `SELECT c.id_cms FROM ps_cms c JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
       WHERE c.active = 1 AND cl.link_rewrite = ?`, [linkRewrite])
    if (dupCheck) {
      throw createError({ statusCode: 422, message: `Slug déjà utilisé par l'article #${dupCheck.id_cms}` })
    }

    const active = body.active ? 1 : 0
    const indexation = body.indexation === false ? 0 : 1

    
    const insert = await db.run(`
      INSERT INTO ps_cms
        (id_cms_category, position, active, indexation)
      VALUES (?, 0, ?, ?)
    `, [categoryId, active, indexation])

    const newId = insert.insertId
    if (!newId) throw createError({ statusCode: 500, message: 'Échec création' })

    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(`
        INSERT INTO ps_cms_lang
          (id_cms, id_lang, id_shop, meta_title, head_seo_title, meta_description, content, link_rewrite)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      `, [
        newId,
        Number(l.id_lang),
        title,
        langFields.head_seo_title || '',
        langFields.meta_description || '',
        langFields.content || '',
        linkRewrite,
      ])
    }

    
    try {
      await upsertCmsExtraFacade(newId, body, { event })
    } catch {  }

    
    
    await purgeSwrCache(blogPurgePathsFromSlug(linkRewrite))

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  
  const id = Number(rawId)
  const exists = await db.get<any>(`SELECT id_cms, id_cms_category, active FROM ps_cms WHERE id_cms = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Article introuvable' })

  
  if (Number(exists.id_cms_category) === 1) {
    throw createError({ statusCode: 404, message: 'Article introuvable (landing page)' })
  }

  
  
  const prevMasterRow = await db.get<any>(
    `SELECT link_rewrite FROM ps_cms_lang WHERE id_cms = ? AND id_lang = 1 AND id_shop = 1`, [id])
  const prevMasterSlug: string = prevMasterRow?.link_rewrite || ''
  let authoritativeSlug = prevMasterSlug
  let isActiveAfter = Number(exists.active) === 1

  if (isMaster) {
    const cf: string[] = []
    const cp: any[] = []
    let effectiveCat = Number(exists.id_cms_category)
    if (body.categoryId !== undefined) {
      const newCat = Number(body.categoryId) || 0
      if (newCat <= 0 || newCat === 1) {
        throw createError({ statusCode: 422, message: 'Catégorie de blog obligatoire (≠ racine)' })
      }
      await assertArticleCategoryDepth(db, newCat)
      cf.push('id_cms_category = ?'); cp.push(newCat)
      effectiveCat = newCat
    }
    if (body.active !== undefined) { cf.push('active = ?'); cp.push(body.active ? 1 : 0); isActiveAfter = !!body.active }
    if (body.indexation !== undefined) { cf.push('indexation = ?'); cp.push(body.indexation ? 1 : 0) }
    if (cf.length) {
      
      await db.run(`UPDATE ps_cms SET ${cf.join(', ')} WHERE id_cms = ?`, [...cp, id])
    }

    
    
    const finalInput = body.linkRewrite !== undefined ? body.linkRewrite : prevMasterSlug
    const recomputed = await buildBlogFullSlug(db, effectiveCat, finalInput)
    if (recomputed) authoritativeSlug = recomputed
  }

  
  
  if (isMaster && authoritativeSlug && authoritativeSlug !== prevMasterSlug) {
    const dupCheck = await db.get<any>(
      `SELECT c.id_cms FROM ps_cms c JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
       WHERE c.active = 1 AND cl.link_rewrite = ? AND c.id_cms <> ?`, [authoritativeSlug, id])
    if (dupCheck) {
      throw createError({ statusCode: 422, message: `Slug déjà utilisé par l'article #${dupCheck.id_cms}` })
    }
    
    await db.run(`UPDATE ps_cms_lang SET link_rewrite = ? WHERE id_cms = ?`, [authoritativeSlug, id])
    
    if (isActiveAfter && prevMasterSlug) {
      await upsertBlogRedirect(db, prevMasterSlug, authoritativeSlug, id)
    }
  }

  const hasAnyLangField = Object.values(langFields).some((v) => v !== undefined)
  if (hasAnyLangField) {
    const existingLang = await db.get<any>(`
      SELECT meta_title, head_seo_title, meta_description, content, link_rewrite
        FROM ps_cms_lang WHERE id_cms = ? AND id_lang = ? AND id_shop = 1
    `, [id, langId])

    const row = {
      meta_title: langFields.meta_title ?? existingLang?.meta_title ?? '',
      head_seo_title: langFields.head_seo_title ?? existingLang?.head_seo_title ?? '',
      meta_description: langFields.meta_description ?? existingLang?.meta_description ?? '',
      content: langFields.content ?? existingLang?.content ?? '',
      
      link_rewrite: authoritativeSlug || existingLang?.link_rewrite || slugify(langFields.meta_title || existingLang?.meta_title || ''),
    }

    await db.run(`
      INSERT INTO ps_cms_lang
        (id_cms, id_lang, id_shop, meta_title, head_seo_title, meta_description, content, link_rewrite)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT (id_cms, id_shop, id_lang) DO UPDATE SET
        meta_title = EXCLUDED.meta_title,
        head_seo_title = EXCLUDED.head_seo_title,
        meta_description = EXCLUDED.meta_description,
        content = EXCLUDED.content,
        link_rewrite = EXCLUDED.link_rewrite
    `, [
      id, langId,
      row.meta_title, row.head_seo_title, row.meta_description,
      row.content, row.link_rewrite,
    ])
  }

  
  
  if (isMaster && Array.isArray(body.faqs)) {
    try {
      await replaceFaqsForParent('cms', id, langId, body.faqs.map((f: any, i: number) => ({
        position: i,
        active: !!f.active,
        question: String(f.question || ''),
        answer: String(f.answer || '').trim(),
      })), { event })
    } catch (err: any) {
      if (err?.errno !== 1146 && err?.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[bo/blog PUT] FAQ save error:', err?.message)
      }
    }
  } else if (!isMaster && Array.isArray(body.faqs)) {
    try {
      await upsertFaqTranslations('cms', id, langId, body.faqs.map((f: any) => ({
        id: Number(f.id),
        question: String(f.question || ''),
        answer: String(f.answer || ''),
      })), { event })
    } catch {  }
  }

  
  if (isMaster && Array.isArray(body.linkedCategoryIds)) {
    try {
      const { replaceCategoryLinksFromCms } = await import('~/modules/category-cms/server/utils/category-cms')
      await replaceCategoryLinksFromCms(Number(id), body.linkedCategoryIds, { event })
    } catch (err: any) {
      console.error('[bo/blog PUT] linkedCategories save error:', err?.message)
    }
  }

  
  if (isMaster) {
    try {
      await upsertCmsExtraFacade(id, body, { event })
    } catch (err: any) {
      if (err?.errno !== 1146 && err?.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[bo/blog PUT] cms_extra save error:', err?.message)
      }
    }
  }

  
  
  const purgePaths = blogPurgePathsFromSlug(authoritativeSlug)
  if (prevMasterSlug && prevMasterSlug !== authoritativeSlug) {
    purgePaths.push(...blogPurgePathsFromSlug(prevMasterSlug))
  }
  await purgeSwrCache(purgePaths)

  return { success: true, id, langId, isMaster, created: false }
})
