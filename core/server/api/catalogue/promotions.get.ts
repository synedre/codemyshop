

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang, langPrefixFor } from '~/server/utils/lang'
import { buildImageUrl, buildImageSrcset } from '~/server/utils/product-urls'
import { getProductUrls } from '~/server/utils/product-url'
import { isPriceWindowOpen } from '~/server/utils/price-window'
import { applyTaxToCards, attachTaxRateToCards } from '~/server/utils/product-card-tax'
import { visibiliteSql } from '~/utils/product-visibility'

interface PromotionRow {
  id: number
  ref: string | null
  name: string
  link_rewrite: string | null
  description_short: string | null
  priceRaw: number
  id_image: number | null
  id_category_default: number | null
  reduction: number
  reduction_type: 'amount' | 'percentage'
  
  date_from: Date | string | null
  date_to: Date | string | null
}

interface PromotionProduct {
  id: number
  ref: string
  name: string
  url: string
  descriptionShort?: string
  price: string
  priceRaw: number
  pricePromo: string
  pricePromoRaw: number
  reductionLabel: string
  image?: string
  imageLarge?: string
  imageSrcset?: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default defineEventHandler(async (event): Promise<{ products: PromotionProduct[] }> => {
  const tenant = resolveClientId(event)
  if (!tenant) {
    return { products: [] }
  }

  const { limit } = getQuery(event)
  const lim = Math.min(Math.max(Number(limit) || 8, 1), 24)
  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  try {
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const rows = await db.query<PromotionRow>(
      
      
      `SELECT p.id_product AS id,
              p.reference AS ref,
              pl.name AS name,
              pl.link_rewrite AS link_rewrite,
              pl.description_short AS description_short,
              p.price AS priceRaw,
              p.id_category_default AS id_category_default,
              img.id_image AS id_image,
              sp.reduction AS reduction,
              sp.reduction_type AS reduction_type,
              sp.\`from\` AS date_from,
              sp.\`to\` AS date_to
         FROM ps_specific_price sp
         JOIN ps_product p ON p.id_product = sp.id_product
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
         LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
        WHERE p.active = 1
          -- Produits techniques (personnalisation : visibility 'none') : jamais en vitrine.
          AND ${visibiliteSql('p', 'catalog')}
          AND sp.reduction > 0`,
      [idLang],
    )

    
    
    const now = new Date()
    const best = new Map<number, PromotionRow>()
    for (const r of rows) {
      if (!isPriceWindowOpen(r.date_from, r.date_to, now)) continue
      const id = Number(r.id)
      const prev = best.get(id)
      if (!prev || Number(r.reduction || 0) > Number(prev.reduction || 0)) best.set(id, r)
    }
    const kept = [...best.values()]
      .sort((a, b) => Number(b.reduction || 0) - Number(a.reduction || 0) || Number(b.id) - Number(a.id))
      .slice(0, lim)

    const langRow = await db.get<{ iso_code: string }>(
      `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`, [idLang],
    )
    const iso = langRow?.iso_code || 'fr'
    const langPrefix = langPrefixFor(event, iso)
    const ids = kept.map(r => Number(r.id))
    const urlMap = await getProductUrls(db, ids, idLang, { langPrefix, iso, event })

    const products: PromotionProduct[] = kept.map(r => {
      const price = Number(r.priceRaw || 0)
      const reduction = Number(r.reduction || 0)
      const isPct = r.reduction_type === 'percentage'
      const pricePromoRaw = isPct ? price * (1 - reduction) : Math.max(0, price - reduction)
      const reductionLabel = isPct ? `-${Math.round(reduction * 100)}%` : `-${fmtEur(reduction)}`
      const imgId = Number(r.id_image || 0)
      const descShort = r.description_short ? stripHtml(r.description_short).slice(0, 180) : undefined
      const slug = r.link_rewrite || ''
      const url = urlMap.get(Number(r.id)) ?? `/produit/${r.id}`
      return {
        id: Number(r.id),
        ref: r.ref || '',
        name: r.name,
        url,
        descriptionShort: descShort || undefined,
        price: fmtEur(price),
        priceRaw: price,
        pricePromo: fmtEur(pricePromoRaw),
        pricePromoRaw,
        reductionLabel,
        image:       buildImageUrl(imgId, 'home',  slug, tenant),
        imageLarge:  buildImageUrl(imgId, 'large', slug, tenant),
        imageSrcset: buildImageSrcset(imgId, slug),
      }
    })

    
    
    
    
    await applyTaxToCards(db, products)
    
    
    
    await attachTaxRateToCards(db, products)

    
    
    
    
    products.forEach((p, i) => {
      if (kept[i]?.reduction_type === 'percentage') return
      p.reductionLabel = `-${fmtEur(Math.max(0, p.priceRaw - p.pricePromoRaw))}`
    })

    return { products }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { products: [] }
    }
    console.error('[promotions] DB error:', err?.message)
    return { products: [] }
  }
})
