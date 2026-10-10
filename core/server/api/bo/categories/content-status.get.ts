

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { seoBulkItemQueueStatus } from '~/server/utils/seo-bulk-queue'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const idCategory = Number((getQuery(event) as { id_category?: string }).id_category)
  if (!idCategory) {
    throw createError({ statusCode: 422, message: 'id_category requis' })
  }

  try {
    const st = await seoBulkItemQueueStatus(event, 'category', idCategory)
    if (!st.found) return { found: false, status: null }
    if (st.status !== 'done') return { found: true, status: st.status, error_msg: st.error_msg }

    const db = useClientDb(event)
    const row = await db.get<any>(
      `SELECT '' AS short_description, description AS long_description,
              meta_title, meta_description, link_rewrite AS optimized_slug
         FROM ps_category_lang WHERE id_category = ? AND id_lang = 1 LIMIT 1`,
      [idCategory],
    )
    const faq = await db.get<any>(
      `SELECT COUNT(*)::int AS n FROM cs_faq
        WHERE parent_type = 'category' AND parent_id = ? AND active = 1`,
      [idCategory],
    )
    return { found: true, status: 'done', ...(row || {}), faq_count: Number(faq?.n || 0) }
  } catch (err: any) {
    console.error('[categories/content-status] error:', err?.message)
    return { found: false, status: null }
  }
})
