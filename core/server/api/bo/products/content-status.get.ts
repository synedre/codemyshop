

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { seoBulkItemQueueStatus } from '~/server/utils/seo-bulk-queue'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const idProduct = Number((getQuery(event) as { id_product?: string }).id_product)
  if (!idProduct) {
    throw createError({ statusCode: 422, message: 'id_product requis' })
  }

  try {
    const st = await seoBulkItemQueueStatus(event, 'product', idProduct)
    if (!st.found) return { found: false, status: null }
    if (st.status !== 'done') return { found: true, status: st.status, error_msg: st.error_msg }

    const db = useClientDb(event)
    const row = await db.get<any>(
      `SELECT description_short AS short_description, description AS long_description,
              meta_title, meta_description, link_rewrite AS optimized_slug
         FROM ps_product_lang WHERE id_product = ? AND id_lang = 1 LIMIT 1`,
      [idProduct],
    )
    return { found: true, status: 'done', ...(row || {}) }
  } catch (err: any) {
    console.error('[products/content-status] error:', err?.message)
    return { found: false, status: null }
  }
})
