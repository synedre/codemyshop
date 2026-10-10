

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { getCdnCoverPositions, cdnImageUrl } from '~/server/utils/cover-cdn'
import { buildProductImage } from '~/server/utils/ps-image'
import { roundDisplayPrice } from '~/server/utils/ps-tax'
import {
  getSpecificPriceTiers,
  pickTierForQuantity,
  specificPriceLabel,
} from '~/server/utils/specific-price'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'
import { attributsParDeclinaison } from '~/utils/cart-line-layout'
import { callAction, applyFilter } from '~/server/utils/hooks-bus'
import { verifierProduitAjoutable, verifierStock, type StockLigne } from '~/server/utils/cart-guard'
import {
  prixLigneHT,
  rayonDePersonnalisation,
  resoudrePersonnalisation,
  type CustomizationInput,
} from '~/server/utils/cart-customization'
import { verdictRegle } from '~/server/utils/cart-rule-check'
import { t } from '~/server/utils/i18n'
import { HOOKS_ACTION, HOOKS_FILTER, type ActionCartUpdatedPayload } from '~/server/utils/hooks-catalog'

interface CartContext {
  event?: any
  clientId?: string
}

function asArray<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function firstOf<T = any>(result: any): T | null {
  return asArray<T>(result)[0] ?? null
}

let personnalisationPresente = false
export async function tablePersonnalisationPresente(d: ReturnType<typeof usePocPg>): Promise<boolean> {
  if (personnalisationPresente) return true
  const row = await d.execute(sql`SELECT to_regclass('cs_main.cs_cart_line_customization') IS NOT NULL AS ok`)
    .then(firstOf<{ ok: boolean }>).catch(() => null)
  personnalisationPresente = row?.ok === true
  return personnalisationPresente
}

export function colonnesPersonnalisation(presente: boolean) {
  return presente
    ? {
        colonnes: sql`cu.kind AS custom_kind, cu.text AS custom_text, cu.color_hex AS custom_color_hex,
           cu.color_label AS custom_color_label, cu.fee_tax_excl AS custom_fee,`,
        jointure: sql`LEFT JOIN cs_main.cs_cart_line_customization cu
        ON cu.id_customization = cp.id_customization AND cp.id_customization <> 0`,
      }
    : {
        colonnes: sql`NULL AS custom_kind, NULL AS custom_text, NULL AS custom_color_hex,
           NULL AS custom_color_label, NULL AS custom_fee,`,
        jointure: sql``,
      }
}

export interface CartItemRow {
  productId: number
  combinationId: number
  
  customizationId?: number
  

  customization?: { kind: string; text: string; colorHex: string; colorLabel?: string; fee: number }
  name: string
  reference: string
  quantity: number
  priceHT: number
  priceTTC: number
  image?: string
  

  format?: string
  packaging?: string
  caliber?: string
  

  pricePerKgHT?: number
  pricePerKgFormatted?: string
  

  taxRate?: number
  

  priceHTBeforeDiscount?: number
  
  pricePerKgFormattedBeforeDiscount?: string
  
  reductionLabel?: string
  

  unitLabel?: string
  

  variantAttributes?: Array<{ group: string; value: string }>
}

const fmtEurFr = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function parseWeightToKg(s: string | null | undefined): number | null {
  if (!s) return null
  const m = String(s).trim().toLowerCase().replace(',', '.').match(/^([\d.]+)\s*(kg|g)$/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return m[2] === 'kg' ? n : n / 1000
}

export interface CartDataRow {
  id: number
  customerId: number
  items: CartItemRow[]
  
  subtotalHT: number
  
  subtotalTTC: number
  
  totalHT: number
  
  totalTTC: number
  totalTax: number
  shippingCost: number
  carrierId: number | null
  discountCode?: string
  discountHT?: number
  discountTTC?: number
}

async function getTaxRatesForProductsRaw(
  productIds: number[],
  countryId = 8,
  _ctx: CartContext = {},
  postcode: string | null = null,
  vatNumber: string | null = null,
): Promise<{ rates: Map<number, number>; taxGroups: Map<number, number> }> {
  const out = new Map<number, number>()
  const taxGroups = new Map<number, number>()
  if (!productIds.length) return { rates: out, taxGroups }

  
  
  
  if (countryId !== 8 && countryId !== 0 && vatNumber) {
    const d2 = usePocPg()
    
    
    const checkRow: any = (await d2.execute(sql`
      SELECT
        (SELECT iso_code FROM cs_main.ps_country WHERE id_country = ${countryId} LIMIT 1) AS iso,
        (SELECT is_valid FROM cs_main.cs_vat_intracom_cache
          WHERE vat_number = ${String(vatNumber).toUpperCase().replace(/[\s.\-]/g, '')}
            AND expires_at > NOW() LIMIT 1) AS vat_valid
    `).catch(() => [] as any[]) as any[])[0]
    const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','DE'])
    if (checkRow?.iso && EU.has(String(checkRow.iso)) && Number(checkRow.vat_valid) === 1) {
      
      
      const groupsResult = await usePocPg().execute(sql`
        SELECT id_product, id_tax_rules_group FROM cs_main.ps_product
         WHERE id_product IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})
      `).catch(() => null)
      if (groupsResult) {
        for (const r of asArray<any>(groupsResult)) {
          const pid = Number(r.id_product)
          out.set(pid, 0)
          taxGroups.set(pid, Number(r.id_tax_rules_group || 0))
        }
      }
      return { rates: out, taxGroups }
    }
  }

  
  if (countryId !== 8 && countryId !== 0) {
    const d3 = usePocPg()
    const isoRow: any = (await d3.execute(sql`
      SELECT iso_code FROM cs_main.ps_country WHERE id_country = ${countryId} LIMIT 1
    `).catch(() => [] as any[]) as any[])[0]
    const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','DE','FR'])
    if (isoRow?.iso_code && !EU.has(String(isoRow.iso_code))) {
      
      for (const pid of productIds) out.set(pid, 0)
      return { rates: out, taxGroups }
    }
    
    
    
    
    countryId = 8
  }

  const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `)
  
  
  
  
  const pc = String(postcode || '').trim()
  const result = await usePocPg().execute(sql`
    SELECT p.id_product, p.id_tax_rules_group,
           COALESCE(
             (SELECT t.rate FROM cs_main.ps_tax_rule tr2
                JOIN cs_main.ps_tax t ON t.id_tax = tr2.id_tax
               WHERE tr2.id_tax_rules_group = p.id_tax_rules_group
                 AND tr2.id_country = ${countryId}
                 AND t.active = 1
                 AND tr2.zipcode_from <> '' AND tr2.zipcode_from <> '0'
                 AND ${pc} BETWEEN tr2.zipcode_from AND tr2.zipcode_to
               LIMIT 1),
             (SELECT t.rate FROM cs_main.ps_tax_rule tr1
                JOIN cs_main.ps_tax t ON t.id_tax = tr1.id_tax
               WHERE tr1.id_tax_rules_group = p.id_tax_rules_group
                 AND tr1.id_country = ${countryId}
                 AND t.active = 1
                 AND (tr1.zipcode_from = '' OR tr1.zipcode_from = '0')
               LIMIT 1),
             0
           ) AS rate
      FROM cs_main.ps_product p
     WHERE p.id_product IN (${ids})
  `).catch(() => null)
  if (!result) return { rates: out, taxGroups }
  for (const r of asArray<any>(result)) {
    const pid = Number(r.id_product)
    out.set(pid, Number(r.rate || 0))
    taxGroups.set(pid, Number(r.id_tax_rules_group || 0))
  }
  
  
  
  return { rates: out, taxGroups }
}

export async function getTaxRatesForProducts(
  productIds: number[],
  countryId = 8,
  ctx: CartContext = {},
  postcode: string | null = null,
  vatNumber: string | null = null,
): Promise<Map<number, number>> {
  const { rates, taxGroups } = await getTaxRatesForProductsRaw(productIds, countryId, ctx, postcode, vatNumber)
  return applyFilter<Map<number, number>>(HOOKS_FILTER.TAX_RATE, rates, { countryId, postcode, taxGroups })
}

export async function getCartFromDb(cartId: number, ctx: CartContext = {}): Promise<CartDataRow | null> {
  const d = usePocPg()
  const cart = firstOf<any>(await d.execute(sql`
    SELECT id_cart, id_customer, id_carrier FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
  `))
  if (!cart) return null

  const perso = colonnesPersonnalisation(await tablePersonnalisationPresente(d))

  
  
  
  const items = asArray<any>(await d.execute(sql`
    SELECT cp.id_product, cp.id_product_attribute, cp.quantity, cp.id_customization,
           ${perso.colonnes}
           COALESCE(pl.name, plf.name, '')                 AS name,
           COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
           p.reference                                      AS reference,
           p.weight                                         AS "weightKg",
           p.unit_price_ratio                               AS "unitPriceRatio",
           p.unity                                          AS "unity",
           COALESCE(pa.price, 0) + ps.price                AS "priceHT",
           (SELECT id_image FROM cs_main.ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image,
           feat.packaging                                   AS packaging,
           feat.caliber                                     AS caliber,
           feat."unitsPerPack"                              AS "unitsPerPack",
           feat."netWeight"                                 AS "netWeight"
      FROM cs_main.ps_cart_product cp
      JOIN cs_main.ps_product p  ON p.id_product = cp.id_product
      JOIN cs_main.ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
 LEFT JOIN cs_main.ps_product_attribute pa ON pa.id_product_attribute = cp.id_product_attribute AND pa.id_product = p.id_product
 LEFT JOIN cs_main.ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = 1 AND pl.id_shop = 1
 LEFT JOIN cs_main.ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
 LEFT JOIN (
        SELECT fp.id_product,
               MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
               MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
               MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS "unitsPerPack",
               MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS "netWeight"
          FROM cs_main.ps_feature_product fp
          JOIN cs_main.ps_feature_lang fl        ON fl.id_feature        = fp.id_feature        AND fl.id_lang  = 1
          JOIN cs_main.ps_feature_value_lang fvl ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = 1
         WHERE fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
         GROUP BY fp.id_product
      ) feat ON feat.id_product = p.id_product
     ${perso.jointure}
     WHERE cp.id_cart = ${cartId}
     ORDER BY cp.id_product, cp.id_customization
  `))

  
  
  
  
  
  const deliveryAddr = await d.execute(sql`
    SELECT a.id_country, a.postcode, a.vat_number FROM cs_main.ps_cart c
      LEFT JOIN cs_main.ps_address a ON a.id_address = c.id_address_delivery
     WHERE c.id_cart = ${cartId} LIMIT 1
  `).then(firstOf<{ id_country: number; postcode: string; vat_number: string }>).catch(() => null)
  const countryId = Number(deliveryAddr?.id_country || 8)
  const postcode = String(deliveryAddr?.postcode || '')
  const vatNumber = String(deliveryAddr?.vat_number || '')
  const productIds = items.map((r: any) => Number(r.id_product))
  const taxRates = await getTaxRatesForProducts(productIds, countryId, ctx, postcode, vatNumber)
  const specificPrices = await getSpecificPriceTiers(productIds, ctx)
  const unitPricing = tenantHasUnitPricing(ctx.event)

  
  
  
  const comboIds = [...new Set(items.map((r: any) => Number(r.id_product_attribute || 0)).filter((id: number) => id > 0))]
  const declinaisons = comboIds.length === 0 ? new Map<number, Array<{ group: string; value: string }>>() : attributsParDeclinaison(asArray<any>(await d.execute(sql`
    SELECT pac.id_product_attribute,
           COALESCE(agl.public_name, agl.name, '') AS group_name,
           COALESCE(al.name, '')                   AS attribute_name
      FROM cs_main.ps_product_attribute_combination pac
      JOIN cs_main.ps_attribute a        ON a.id_attribute = pac.id_attribute
      JOIN cs_main.ps_attribute_group ag ON ag.id_attribute_group = a.id_attribute_group
 LEFT JOIN cs_main.ps_attribute_lang al        ON al.id_attribute = a.id_attribute AND al.id_lang = 1
 LEFT JOIN cs_main.ps_attribute_group_lang agl ON agl.id_attribute_group = ag.id_attribute_group AND agl.id_lang = 1
     WHERE pac.id_product_attribute IN (${sql.join(comboIds.map((id) => sql`${id}`), sql`, `)})
     ORDER BY pac.id_product_attribute, ag.position, a.position
  `).catch(() => [])))

  
  const discountRow = await d.execute(sql`
    SELECT cr.id_cart_rule, cr.code, cr.reduction_percent, cr.reduction_amount, cr.reduction_tax,
           crl.name
      FROM cs_main.ps_cart_cart_rule ccr
      JOIN cs_main.ps_cart_rule cr ON cr.id_cart_rule = ccr.id_cart_rule
 LEFT JOIN cs_main.ps_cart_rule_lang crl ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = 1
     WHERE ccr.id_cart = ${cartId}
       AND cr.date_from <= NOW()
       AND cr.date_to   >= NOW()
     ORDER BY ccr.id_cart_rule DESC
     LIMIT 1
  `).then(firstOf<any>).catch(() => null)

  
  
  
  const roundUpRow = firstOf<any>(await d.execute(sql`
    SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_PRICE_ROUND_UP' LIMIT 1`))
  const roundUp = roundUpRow?.value === '1'

  const mapped: CartItemRow[] = items.map((r: any) => {
    const productId = Number(r.id_product)
    const basePriceHT = Number(r.priceHT || 0)
    
    
    
    
    const sp = pickTierForQuantity(specificPrices.get(productId), Number(r.quantity || 1))
    
    
    const fee = r.custom_kind ? Number(r.custom_fee || 0) : 0
    const priceHT = prixLigneHT(basePriceHT, sp, fee)
    const hasPromo = sp !== undefined && priceHT < basePriceHT + fee
    const rate = taxRates.get(productId) ?? 0
    const priceTTC = roundDisplayPrice(priceHT * (1 + rate / 100), roundUp)

    
    
    const unitsRaw = r.unitsPerPack ? Number(r.unitsPerPack) : NaN
    const unitsPerPack = Number.isFinite(unitsRaw) && unitsRaw > 1 ? unitsRaw : undefined
    const weightKg = Number(r.weightKg || 0)
    let format: string | undefined
    if (unitsPerPack && r.netWeight) format = `${unitsPerPack} × ${r.netWeight}`
    else if (r.netWeight) format = String(r.netWeight)
    else if (weightKg && weightKg > 0) {
      format = weightKg < 1
        ? `${Math.round(weightKg * 1000)}g`
        : `${weightKg.toString().replace('.', ',')}kg`
    }
    const netWeightKg = parseWeightToKg(r.netWeight)
    
    
    
    const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
    
    
    
    
    const pricing = unitPricing
      ? deriveUnitPricing({
          priceHT,
          unitPriceRatio: r.unitPriceRatio,
          unity: r.unity,
          unitsPerPack,
          netWeightKg: totalNetKg,
          productWeightKg: weightKg,
        })
      : { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
    const pricePerKgHT = pricing.pricePerUnit
    const pricePerKgHTBeforeDiscount = hasPromo && pricing.divisor && pricing.divisor > 0
      ? basePriceHT / pricing.divisor
      : undefined

    return {
      productId,
      combinationId: Number(r.id_product_attribute || 0),
      customizationId: Number(r.id_customization || 0),
      customization: r.custom_kind
        ? {
            kind: String(r.custom_kind),
            text: String(r.custom_text || ''),
            colorHex: String(r.custom_color_hex || ''),
            colorLabel: r.custom_color_label ? String(r.custom_color_label) : undefined,
            fee,
          }
        : undefined,
      name: String(r.name || ''),
      reference: String(r.reference || ''),
      quantity: Number(r.quantity || 0),
      priceHT,
      priceTTC,
      image: buildProductImage(Number(r.id_image), r.link_rewrite)?.src,
      format,
      packaging: r.packaging || undefined,
      caliber: r.caliber || undefined,
      pricePerKgHT,
      pricePerKgFormatted: pricePerKgHT !== undefined ? fmtEurFr(pricePerKgHT) : undefined,
      taxRate: rate || undefined,
      unitLabel: pricing.unitLabel,
      priceHTBeforeDiscount: hasPromo ? basePriceHT + fee : undefined,
      pricePerKgFormattedBeforeDiscount: pricePerKgHTBeforeDiscount !== undefined
        ? fmtEurFr(pricePerKgHTBeforeDiscount)
        : undefined,
      reductionLabel: hasPromo && sp ? specificPriceLabel(sp) : undefined,
      variantAttributes: declinaisons.get(Number(r.id_product_attribute || 0)),
    }
  })

  
  
  const coverPos = await getCdnCoverPositions(d, ctx.clientId ?? null, productIds)
  if (coverPos.size) {
    const slugById = new Map(items.map((r: any) => [Number(r.id_product), String(r.link_rewrite || '')]))
    for (const it of mapped) {
      const pos = coverPos.get(it.productId)
      if (pos) it.image = cdnImageUrl(it.productId, pos, slugById.get(it.productId))
    }
  }

  const totalHT = mapped.reduce((s, it) => s + it.priceHT * it.quantity, 0)
  const totalTTC = mapped.reduce((s, it) => s + it.priceTTC * it.quantity, 0)
  let discountHT = 0
  if (discountRow) {
    const pct = Number(discountRow.reduction_percent || 0)
    const flat = Number(discountRow.reduction_amount || 0)
    if (pct > 0) discountHT = totalHT * (pct / 100)
    else if (flat > 0) discountHT = flat
  }
  const taxRatio = totalHT > 0 ? totalTTC / totalHT : 1
  const discountTTC = discountHT * taxRatio
  const totalTax = totalTTC - totalHT

  
  
  
  const appliedCorseTva = countryId === 8 && /^20\d{3}$/.test(postcode.trim())

  return {
    id: Number(cart.id_cart),
    customerId: Number(cart.id_customer || 0),
    items: mapped,
    subtotalHT: totalHT,
    subtotalTTC: totalTTC,
    totalHT: totalHT - discountHT,
    totalTTC: totalTTC - discountTTC,
    totalTax: totalTax - (discountTTC - discountHT),
    shippingCost: 0,
    carrierId: cart.id_carrier ? Number(cart.id_carrier) : null,
    discountCode: discountRow?.code || undefined,
    discountHT: discountHT || undefined,
    discountTTC: discountTTC || undefined,
    appliedCorseTva,
    deliveryPostcode: postcode.trim() || undefined,
  }
}

export async function getLastActiveCartFromDb(customerId: number, ctx: CartContext = {}): Promise<CartDataRow | null> {
  const row = await usePocPg().execute(sql`
    SELECT c.id_cart
      FROM cs_main.ps_cart c
     WHERE c.id_customer = ${customerId}
       AND EXISTS (SELECT 1 FROM cs_main.ps_cart_product cp WHERE cp.id_cart = c.id_cart)
       AND NOT EXISTS (SELECT 1 FROM cs_main.ps_orders o WHERE o.id_cart = c.id_cart)
     ORDER BY c.date_upd DESC
     LIMIT 1
  `).then(firstOf<{ id_cart: number }>)
  return row ? getCartFromDb(Number(row.id_cart), ctx) : null
}

export async function createCartInDb(customerId: number, _ctx: CartContext = {}): Promise<number> {
  const result: any = await usePocPg().execute(sql`
    INSERT INTO cs_main.ps_cart
        (id_shop_group, id_shop, id_carrier, delivery_option, id_lang, id_address_delivery,
         id_address_invoice, id_currency, id_customer, id_guest, secure_key, recyclable, gift,
         gift_message, mobile_theme, allow_seperated_package, date_add, date_upd)
     VALUES (1, 1, 0, '', 1, 0, 0, 1, ${customerId}, 0, '-1', 0, 0, '', 0, 0, NOW(), NOW())
    RETURNING id_cart
  `)
  return Number((result as any[])?.[0]?.id_cart ?? 0)
}

export async function lireStocksLignes(
  d: ReturnType<typeof usePocPg>,
  lignes: Array<{ productId: number; comboId: number }>,
): Promise<Map<string, StockLigne>> {
  const out = new Map<string, StockLigne>()
  if (!lignes.length) return out
  const ids = [...new Set(lignes.map(l => Number(l.productId)))]
  const conf = asArray<{ name: string; value: string }>(await d.execute(sql`
    SELECT name, value FROM cs_main.ps_configuration
     WHERE name IN ('PS_ORDER_OUT_OF_STOCK', 'PS_STOCK_MANAGEMENT')
  `))
  const val = (n: string) => conf.find(c => c.name === n)?.value ?? null
  const stocks = asArray<{ id_product: number; id_product_attribute: number; quantity: number; out_of_stock: number }>(await d.execute(sql`
    SELECT id_product, id_product_attribute, quantity, out_of_stock
      FROM cs_main.ps_stock_available
     WHERE id_product IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})
  `))
  const avecDeclinaisons = new Set(asArray<{ id_product: number }>(await d.execute(sql`
    SELECT DISTINCT id_product FROM cs_main.ps_product_attribute
     WHERE id_product IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})
  `)).map(r => Number(r.id_product)))
  for (const l of lignes) {
    const comboId = Number(l.comboId || 0)
    const ligneStock = stocks.find(r => Number(r.id_product) === Number(l.productId) && Number(r.id_product_attribute) === comboId)
    
    const mere = stocks.find(r => Number(r.id_product) === Number(l.productId) && Number(r.id_product_attribute) === 0)
    out.set(`${l.productId}-${comboId}`, {
      quantite: ligneStock ? Number(ligneStock.quantity) : null,
      outOfStock: mere?.out_of_stock ?? ligneStock?.out_of_stock ?? null,
      defautBoutique: val('PS_ORDER_OUT_OF_STOCK'),
      gestionStock: val('PS_STOCK_MANAGEMENT'),
      aDeclinaisons: avecDeclinaisons.has(Number(l.productId)),
      idDeclinaison: comboId,
    })
  }
  return out
}

async function exigerStock(d: ReturnType<typeof usePocPg>, productId: number, comboId: number, demande: number): Promise<void> {
  const ligne = (await lireStocksLignes(d, [{ productId, comboId }])).get(`${productId}-${Number(comboId || 0)}`)
  const refus = ligne ? verifierStock(ligne, demande) : null
  if (!refus) return
  const reste = Math.max(0, Math.floor(Number(ligne?.quantite ?? 0)))
  throw createError({
    statusCode: refus.statusCode,
    message: (await t(refus.messageKey, 1, refus.fallback)).replace('{n}', String(reste)),
  })
}

export async function addToCartInDb(
  cartId: number,
  productId: number,
  quantity: number,
  comboId: number,
  _ctx: CartContext = {},
  customization?: CustomizationInput | null,
): Promise<void> {
  const d = usePocPg()

  
  
  
  
  
  
  
  
  
  
  const produit = await d.execute(sql`
    SELECT ps.active, COALESCE(pa.price, 0) + ps.price AS "priceHT"
      FROM cs_main.ps_product_shop ps
 LEFT JOIN cs_main.ps_product_attribute pa
        ON pa.id_product_attribute = ${comboId || 0} AND pa.id_product = ps.id_product
     WHERE ps.id_product = ${productId} AND ps.id_shop = 1
     LIMIT 1
  `).then(firstOf<{ active: number; priceHT: number | string }>)

  const refus = verifierProduitAjoutable(produit)
  if (refus) {
    
    
    
    throw createError({
      statusCode: refus.statusCode,
      message: await t(refus.messageKey, 1, refus.fallback),
    })
  }

  
  
  const dejaAuPanier = firstOf<{ q: number }>(await d.execute(sql`
    SELECT COALESCE(SUM(quantity), 0)::int AS q FROM cs_main.ps_cart_product
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND id_product_attribute = ${comboId || 0}
  `))?.q ?? 0
  await exigerStock(d, productId, comboId, Number(dejaAuPanier) + quantity)

  
  
  const customizationId = customization
    ? await enregistrerPersonnalisation(d, cartId, productId, customization)
    : 0

  
  await d.execute(sql`
    INSERT INTO cs_main.ps_cart_product
        (id_cart, id_product, id_product_attribute, id_customization, id_address_delivery,
         id_shop, quantity, date_add)
     VALUES (${cartId}, ${productId}, ${comboId || 0}, ${customizationId}, 0, 1, ${quantity}, NOW())
     ON CONFLICT (id_cart, id_product, id_product_attribute, id_customization, id_address_delivery)
     DO UPDATE SET quantity = cs_main.ps_cart_product.quantity + EXCLUDED.quantity
  `)
  await d.execute(sql`UPDATE cs_main.ps_cart SET date_upd = NOW() WHERE id_cart = ${cartId}`)

  callAction<ActionCartUpdatedPayload>(HOOKS_ACTION.CART_UPDATED, {
    cartId, productId, quantity, action: 'add',
  }).catch((err: any) => {
    console.error(`[cart-db] hook '${HOOKS_ACTION.CART_UPDATED}' (add) failed:`, err?.message)
  })
}

async function enregistrerPersonnalisation(
  d: ReturnType<typeof usePocPg>,
  cartId: number,
  productId: number,
  input: CustomizationInput,
): Promise<number> {
  const cfgPublic = (useRuntimeConfig().public as any) ?? {}
  const rayon = rayonDePersonnalisation(input?.kind, cfgPublic)
  const dansLeRayon = rayon > 0 && await d.execute(sql`
    SELECT 1 AS ok
      FROM cs_main.ps_category child
      JOIN cs_main.ps_category root ON root.id_category = ${rayon}
     WHERE child.id_category = (
             SELECT id_category_default FROM cs_main.ps_product WHERE id_product = ${productId} LIMIT 1
           )
       AND child.nleft >= root.nleft
       AND child.nright <= root.nright
     LIMIT 1
  `).then(r => asArray(r).length > 0).catch(() => false)

  const decision = resoudrePersonnalisation(input, cfgPublic, dansLeRayon)
  if ('refus' in decision) {
    throw createError({
      statusCode: decision.refus.statusCode,
      message: await t(decision.refus.messageKey, 1, decision.refus.fallback),
    })
  }
  const c = decision.ok
  const existante = firstOf<{ id_customization: number }>(await d.execute(sql`
    SELECT id_customization FROM cs_main.cs_cart_line_customization
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND kind = ${c.kind}
       AND text = ${c.text} AND COALESCE(color_hex, '') = ${c.colorHex ?? ''}
     ORDER BY id_customization LIMIT 1
  `))
  if (existante) return Number(existante.id_customization)
  const cree = firstOf<{ id_customization: number }>(await d.execute(sql`
    INSERT INTO cs_main.cs_cart_line_customization
        (id_cart, id_product, kind, text, color_hex, color_label, fee_tax_excl, date_add)
     VALUES (${cartId}, ${productId}, ${c.kind}, ${c.text}, ${c.colorHex}, ${c.colorLabel}, ${c.fee}, NOW())
     RETURNING id_customization
  `))
  return Number(cree?.id_customization)
}

export async function updateCartItemInDb(
  cartId: number,
  productId: number,
  quantity: number,
  comboId: number,
  ctx: CartContext = {},
  customizationId = 0,
): Promise<void> {
  if (quantity <= 0) {
    await removeFromCartInDb(cartId, productId, comboId, ctx, customizationId)
    return
  }
  const d = usePocPg()
  
  
  const autres = firstOf<{ q: number }>(await d.execute(sql`
    SELECT COALESCE(SUM(quantity), 0)::int AS q FROM cs_main.ps_cart_product
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND id_product_attribute = ${comboId || 0}
       AND id_customization <> ${customizationId || 0}
  `))?.q ?? 0
  await exigerStock(d, productId, comboId, Number(autres) + quantity)
  await d.execute(sql`
    UPDATE cs_main.ps_cart_product SET quantity = ${quantity}
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND id_product_attribute = ${comboId || 0}
       AND id_customization = ${customizationId || 0}
  `)
  await d.execute(sql`UPDATE cs_main.ps_cart SET date_upd = NOW() WHERE id_cart = ${cartId}`)

  callAction<ActionCartUpdatedPayload>(HOOKS_ACTION.CART_UPDATED, {
    cartId, productId, quantity, action: 'update',
  }).catch((err: any) => {
    console.error(`[cart-db] hook '${HOOKS_ACTION.CART_UPDATED}' (update) failed:`, err?.message)
  })
}

export async function removeFromCartInDb(
  cartId: number,
  productId: number,
  comboId: number,
  _ctx: CartContext = {},
  customizationId = 0,
): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`
    DELETE FROM cs_main.ps_cart_product
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND id_product_attribute = ${comboId || 0}
       AND id_customization = ${customizationId || 0}
  `)
  await d.execute(sql`UPDATE cs_main.ps_cart SET date_upd = NOW() WHERE id_cart = ${cartId}`)

  callAction<ActionCartUpdatedPayload>(HOOKS_ACTION.CART_UPDATED, {
    cartId, productId, action: 'remove',
  }).catch((err: any) => {
    console.error(`[cart-db] hook '${HOOKS_ACTION.CART_UPDATED}' (remove) failed:`, err?.message)
  })
}

export async function applyCouponToCart(
  cartId: number,
  code: string,
  _ctx: CartContext = {},
): Promise<{ ok: boolean; error?: string }> {
  const d = usePocPg()
  const rule = await d.execute(sql`
    SELECT id_cart_rule, active, quantity, quantity_per_user, date_from, date_to, minimum_amount
      FROM cs_main.ps_cart_rule
     WHERE code = ${code} AND active = 1
     LIMIT 1
  `).then(firstOf<any>)
  
  const verdict = verdictRegle(rule)
  if (!verdict.ok) return verdict

  const ruleId = Number(rule.id_cart_rule)

  
  
  
  const perUserLimit = Number(rule.quantity_per_user || 0)
  if (perUserLimit > 0) {
    const cartCust = await d.execute(sql`
      SELECT id_customer FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
    `).then(firstOf<{ id_customer: number }>)
    const idCustomer = Number(cartCust?.id_customer || 0)
    if (idCustomer > 0) {
      const usedRow = await d.execute(sql`
        SELECT COUNT(*)::int AS n
          FROM cs_main.ps_order_cart_rule ocr
          JOIN cs_main.ps_orders o ON o.id_order = ocr.id_order
         WHERE ocr.id_cart_rule = ${ruleId} AND o.id_customer = ${idCustomer}
      `).then(firstOf<{ n: number }>)
      const used = Number(usedRow?.n || 0)
      if (used >= perUserLimit) {
        return { ok: false, error: `Code promo déjà utilisé ${used > 1 ? used + ' fois' : 'une fois'} — limite ${perUserLimit} par client.` }
      }
    }
  }

  const groupRes = asArray<{ id_group: number }>(await d.execute(sql`
    SELECT id_group FROM cs_main.ps_cart_rule_group WHERE id_cart_rule = ${ruleId}
  `).catch(() => null))
  if (groupRes.length) {
    const cart = await d.execute(sql`
      SELECT id_customer FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
    `).then(firstOf<{ id_customer: number }>)
    if (!cart?.id_customer) return { ok: false, error: 'Code promo réservé aux clients connectés' }
    const allowed = new Set(groupRes.map((r: any) => Number(r.id_group)))
    const custGroups = asArray<{ id_group: number }>(await d.execute(sql`
      SELECT id_group FROM cs_main.ps_customer_group WHERE id_customer = ${Number(cart.id_customer)}
    `))
    const match = custGroups.some((g: any) => allowed.has(Number(g.id_group)))
    if (!match) return { ok: false, error: 'Code promo non applicable à votre profil' }
  }

  const countryRes = asArray<{ id_country: number }>(await d.execute(sql`
    SELECT id_country FROM cs_main.ps_cart_rule_country WHERE id_cart_rule = ${ruleId}
  `).catch(() => null))
  if (countryRes.length) {
    const addr = await d.execute(sql`
      SELECT a.id_country FROM cs_main.ps_cart c
        JOIN cs_main.ps_address a ON a.id_address = c.id_address_delivery
       WHERE c.id_cart = ${cartId} LIMIT 1
    `).then(firstOf<{ id_country: number }>).catch(() => null)
    const cid = Number(addr?.id_country || 0)
    const allowed = new Set(countryRes.map((r: any) => Number(r.id_country)))
    if (!cid || !allowed.has(cid)) {
      return { ok: false, error: 'Code promo non disponible pour votre pays de livraison' }
    }
  }

  await d.execute(sql`DELETE FROM cs_main.ps_cart_cart_rule WHERE id_cart = ${cartId}`)
  await d.execute(sql`INSERT INTO cs_main.ps_cart_cart_rule (id_cart, id_cart_rule) VALUES (${cartId}, ${ruleId})`)
  return { ok: true }
}

export async function removeCouponFromCart(cartId: number, _ctx: CartContext = {}): Promise<void> {
  await usePocPg().execute(sql`DELETE FROM cs_main.ps_cart_cart_rule WHERE id_cart = ${cartId}`)
}
