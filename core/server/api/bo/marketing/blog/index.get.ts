

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const status = (q.status || '').trim()
  const langId = Math.max(1, Number(q.lang) || 1)

  
  const fId       = (q.fId       || '').trim()
  const fTitle    = (q.fTitle    || '').trim()
  const fCategory = (q.fCategory || '').trim()
  const fStatus   = (q.fStatus   || '').trim()

  const db = useClientDb(event)

  const conditions: string[] = ['c.id_cms_category <> 1']
  const params: any[] = []

  if (status === 'active') {
    conditions.push(`c.active = 1`)
  } else if (status === 'draft') {
    conditions.push(`c.active = 0`)
  }

  if (search) {
    conditions.push(`(
      cl.meta_title ILIKE ?
      OR cl.link_rewrite ILIKE ?
      OR ccl.name ILIKE ?
      OR CAST(c.id_cms AS TEXT) = ?
    )`)
    const s = `%${search}%`
    params.push(s, s, s, search)
  }
  if (fId) {
    conditions.push(`CAST(c.id_cms AS TEXT) ILIKE ?`)
    params.push(`%${fId}%`)
  }
  if (fTitle) {
    conditions.push(`(cl.meta_title ILIKE ? OR cl.link_rewrite ILIKE ?)`)
    const s = `%${fTitle}%`
    params.push(s, s)
  }
  if (fCategory) {
    conditions.push(`ccl.name ILIKE ?`)
    params.push(`%${fCategory}%`)
  }
  if (fStatus === 'published') {
    conditions.push(`c.active = 1`)
  } else if (fStatus === 'draft') {
    conditions.push(`c.active = 0`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countRow = await db.get<any>(`
      SELECT COUNT(*) AS total
      FROM ps_cms c
      LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = c.id_cms_category AND ccl.id_lang = ? AND ccl.id_shop = 1
      ${where}
    `, [langId, langId, ...params])
    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    
    
    
    
    
    
    
    let coverThumb = "''"
    let coverSocial = "''"
    let redactionSelect = ", '' AS redactionStatus"
    try {
      await db.query('SELECT 1 FROM cs_covergen_queue LIMIT 0')
      coverThumb = `(SELECT COALESCE(NULLIF(cq.thumb_url, ''), NULLIF(cq.cover_url, '')) FROM cs_covergen_queue cq WHERE cq.id_cms = c.id_cms AND cq.status = 'done' ORDER BY cq.id_covergen DESC LIMIT 1)`
    } catch {  }
    try {
      await db.query('SELECT 1 FROM cs_cms_extra LIMIT 0')
      coverSocial = `(SELECT ce.social_cover_url FROM cs_cms_extra ce WHERE ce.id_cms = c.id_cms LIMIT 1)`
    } catch {  }
    const coverSelect = `, COALESCE(NULLIF(${coverThumb}, ''), NULLIF(${coverSocial}, ''), '') AS thumbUrl`
    try {
      await db.query('SELECT 1 FROM cs_cms_queue LIMIT 0')
      redactionSelect = `, COALESCE((SELECT rq.status FROM cs_cms_queue rq WHERE rq.id_cms = c.id_cms ORDER BY rq.id_redaction DESC LIMIT 1), '') AS redactionStatus`
    } catch {  }

    const pages = await db.query<any>(`
      SELECT
        c.id_cms           AS id,
        c.id_cms_category  AS categoryId,
        c.active,
        c.indexation,
        c.position,
        cl.meta_title      AS title,
        cl.meta_description AS metaDescription,
        cl.link_rewrite    AS linkRewrite,
        COALESCE(ccl.name, '')       AS categoryName
        ${coverSelect}
        ${redactionSelect}
      FROM ps_cms c
      LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_cms_category_lang ccl ON ccl.id_cms_category = c.id_cms_category AND ccl.id_lang = ? AND ccl.id_shop = 1
      ${where}
      ORDER BY c.id_cms DESC
      LIMIT ? OFFSET ?
    `, [langId, langId, ...params, perPage, offset])

    return { pages, total, page, perPage, totalPages: Math.ceil(total / perPage), langId }
  } catch (err: any) {
    console.error('[bo/marketing/blog] DB error:', err?.message)
    return { pages: [], total: 0, page, perPage, totalPages: 0, langId }
  }
})
