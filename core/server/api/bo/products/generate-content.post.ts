

import { requireRoleOrSaas } from '~/server/utils/session'
import { enqueueSeoBulkItem } from '~/server/utils/seo-bulk-queue'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idProduct = Number(body.id_product)
  if (!idProduct) {
    throw createError({ statusCode: 422, message: 'id_product requis' })
  }

  try {
    const r = await enqueueSeoBulkItem(event, 'product', idProduct)
    return {
      queued: true,
      status: 'pending',
      message: r.already
        ? 'Régénération SEO déjà en cours'
        : 'Régénération SEO produit en file — génération dans quelques minutes',
    }
  } catch (err: any) {
    console.error('[products/generate-content] enqueue error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
