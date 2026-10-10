

import { requireCustomer } from '~/server/utils/customer-session'
import { assertOwnership, itemsForList } from '~/server/utils/wishlist-db'
import { useClientDb, resolveClientId } from '~/server/utils/db'
import { applyCdnCovers } from '~/server/utils/cover-cdn'
import { getProductUrls } from '~/server/utils/product-url'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { langPrefixFor } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const query = getQuery(event)
  const idLang = Math.max(1, Number(query?.id_lang || 1))

  if (!(await assertOwnership(id, session.customerId, { event }))) {
    throw createError({ statusCode: 403, message: 'Liste introuvable ou non autorisée' })
  }

  const items = await itemsForList(id, idLang, { event })

  
  const db = useClientDb(event)
  const langRow = await db.get<{ iso_code: string }>(
    `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`,
    [idLang],
  )
  const iso = langRow?.iso_code || 'fr'
  const langPrefix = langPrefixFor(event, iso)
  const tenantPiliers = await resolveTenantPiliers(event, db, idLang).catch(() => [])
  const urlMap = items.length
    ? await getProductUrls(db, items.map(i => i.idProduct), idLang, {
        langPrefix, iso, resolvedPiliers: tenantPiliers,
      }).catch(() => new Map<number, string>())
    : new Map<number, string>()

  
  
  
  const coverView = items.map(i => ({ id: i.idProduct, slug: i.linkRewrite, image: undefined as string | undefined }))
  await applyCdnCovers(db, coverView, { tenant: resolveClientId(event) })
  const coverUrlById = new Map(coverView.filter(c => c.image).map(c => [c.id, c.image as string]))

  return {
    success: true,
    id_wishlist: id,
    items: items.map((i) => {
      const slug = i.linkRewrite || `produit-${i.idProduct}`
      return {
        id_wishlist_product: i.idWishlistProduct,
        id_product: i.idProduct,
        id_product_attribute: i.idProductAttribute,
        quantity: i.quantity,
        priority: i.priority,
        product_name: i.productName,
        link_rewrite: i.linkRewrite,
        base_price: i.basePrice,
        reference: i.reference,
        active: i.active,
        id_image: i.idImage,
        cover_url: coverUrlById.get(i.idProduct),
        url: urlMap.get(i.idProduct) ?? `${langPrefix}/produit/${i.idProduct}-${slug}`,
      }
    }),
    total: items.length,
  }
})
