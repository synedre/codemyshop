

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { listActiveFreightRules, loadCustomerPriceGroups, pickFreightRule } from '~/modules/freight-rule/server/utils/freight-rule'
import { promoteOrderValid } from '~/server/utils/order-valid'
import { issueOrderInvoice } from '~/server/utils/order-invoice'
import type { OrderData, OrderItemData, AddressData } from '~/server/connectors/base'
import {
  getSpecificPriceTiers,
  pickTierForQuantity,
} from '~/server/utils/specific-price'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'
import { buildProductImage } from '~/server/utils/ps-image'
import { getTaxRatesForProducts, tablePersonnalisationPresente, colonnesPersonnalisation, lireStocksLignes } from '~/server/utils/cart-db'
import { lignesEnRupture } from '~/server/utils/cart-guard'
import { mentionPersonnalisation, prixLigneHT } from '~/server/utils/cart-customization'
import { t } from '~/server/utils/i18n'
import { roundDisplayPrice } from '~/server/utils/ps-tax'
import { callAction, applyFilter } from '~/server/utils/hooks-bus'
import { initialOrderStateFor } from '~/server/utils/payment-initial-state'
import {
  HOOKS_ACTION,
  HOOKS_FILTER,
  type ActionOrderCreatedPayload,
  type FilterCartTotalsValue,
} from '~/server/utils/hooks-catalog'

const formatEurFr = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

interface OrdersContext {
  event?: any
  clientId?: string
}

function db(_ctx: OrdersContext = {}) {
  return usePocPg()
}

function rows<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function first<T = any>(result: any): T | null {
  return rows<T>(result)[0] ?? null
}

export type OrderSummary = OrderData
export type OrderItem = OrderItemData

export interface OrderState {
  id: number
  name: string
  color: string
  delivery: boolean
  paid: boolean
  shipped: boolean
}

export interface CarrierSummary {
  id: number
  name: string
  delay: string
  
  price: number
  

  priceTTC: number
  
  taxRate: number
  freeAbove: number | null
  active: boolean
  
  isFree: boolean
  
  francoRule?: { id: number; label: string } | null
  

  isClickCollect: boolean
}

async function fetchAddress(addressId: number, ctx: OrdersContext): Promise<AddressData | undefined> {
  if (!addressId) return undefined
  const a = await db(ctx).execute(sql`
    SELECT a.id_address, a.id_customer, a.id_country, a.alias, a.company, a.firstname, a.lastname,
           a.address1, a.address2, a.postcode, a.city, a.phone, a.phone_mobile, a.vat_number,
           c.iso_code AS country_iso
      FROM cs_main.ps_address a
      LEFT JOIN cs_main.ps_country c ON c.id_country = a.id_country
     WHERE a.id_address = ${addressId} AND a.deleted = 0 LIMIT 1
  `).then(first<any>)
  if (!a) return undefined
  return {
    id: Number(a.id_address),
    customerId: Number(a.id_customer || 0),
    alias: String(a.alias || ''),
    company: a.company ? String(a.company) : undefined,
    firstname: String(a.firstname || ''),
    lastname: String(a.lastname || ''),
    address1: String(a.address1 || ''),
    address2: a.address2 ? String(a.address2) : undefined,
    postcode: String(a.postcode || ''),
    city: String(a.city || ''),
    countryId: Number(a.id_country || 0),
    countryIso: a.country_iso ? String(a.country_iso) : undefined,
    phone: a.phone ? String(a.phone) : undefined,
    phoneMobile: a.phone_mobile ? String(a.phone_mobile) : undefined,
    vatNumber: a.vat_number ? String(a.vat_number) : undefined,
  }
}

export async function getOrderFromDb(orderId: number, ctx: OrdersContext = {}): Promise<OrderData | null> {
  const order = await db(ctx).execute(sql`
    SELECT o.id_order, o.reference, o.id_customer,
           o.total_paid, o.total_paid_tax_incl, o.total_paid_tax_excl,
           o.total_products, o.total_products_wt,
           o.total_shipping, o.total_shipping_tax_incl, o.total_shipping_tax_excl,
           o.total_discounts_tax_incl, o.total_discounts_tax_excl, o.carrier_tax_rate,
           o.current_state, o.date_add, o.payment, o.invoice_number, o.invoice_date,
           o.id_address_delivery, o.id_address_invoice,
           COALESCE(osl.name, '') AS state_name,
           -- Nom de la remise pour l'afficher sur la ligne du récap (Aude
           -- 2026-08-24 : « est-ce possible d'écrire le nom de la remise »).
           -- Plusieurs cart_rules sur une commande → libellés joints.
           COALESCE((
             SELECT string_agg(NULLIF(TRIM(ocr.name), ''), ' + ' ORDER BY ocr.id_order_cart_rule)
               FROM cs_main.ps_order_cart_rule ocr
              WHERE ocr.id_order = o.id_order AND ocr.deleted = 0
           ), '') AS discount_label
      FROM cs_main.ps_orders o
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `).then(first<any>)
  if (!order) return null

  
  
  
  
  
  
  
  
  
  
  
  const unitPricing = tenantHasUnitPricing(ctx.event)
  const items = rows<any>(await db(ctx).execute(sql`
    SELECT od.product_id, od.product_name, od.product_reference, od.product_quantity,
           od.product_attribute_id,
           od.unit_price_tax_excl, od.unit_price_tax_incl,
           od.original_product_price, od.reduction_percent, od.reduction_amount,
           p.unit_price_ratio, p.unity, p.weight,
           pl.link_rewrite,
           COALESCE(
             (SELECT pai.id_image FROM cs_main.ps_product_attribute_image pai
               WHERE pai.id_product_attribute = od.product_attribute_id LIMIT 1),
             (SELECT i.id_image FROM cs_main.ps_image i
               WHERE i.id_product = od.product_id AND i.cover = 1 LIMIT 1)
           ) AS id_image,
           (SELECT string_agg(
                     COALESCE(NULLIF(agl.public_name, ''), agl.name, '') || ' : ' || COALESCE(al.name, ''),
                     ' | ' ORDER BY ag.position, a.position)
              FROM cs_main.ps_product_attribute_combination pac
              JOIN cs_main.ps_attribute a        ON a.id_attribute = pac.id_attribute
              JOIN cs_main.ps_attribute_group ag ON ag.id_attribute_group = a.id_attribute_group
         LEFT JOIN cs_main.ps_attribute_lang al  ON al.id_attribute = a.id_attribute AND al.id_lang = 1
         LEFT JOIN cs_main.ps_attribute_group_lang agl
                ON agl.id_attribute_group = ag.id_attribute_group AND agl.id_lang = 1
             WHERE pac.id_product_attribute = od.product_attribute_id
           ) AS attributes_label
      FROM cs_main.ps_order_detail od
      LEFT JOIN cs_main.ps_product p ON p.id_product = od.product_id
      LEFT JOIN cs_main.ps_product_lang pl
             ON pl.id_product = od.product_id AND pl.id_lang = 1 AND pl.id_shop = 1
     WHERE od.id_order = ${orderId} ORDER BY od.id_order_detail
  `))

  const [addressDelivery, addressInvoice] = await Promise.all([
    fetchAddress(Number(order.id_address_delivery || 0), ctx),
    fetchAddress(Number(order.id_address_invoice || 0), ctx),
  ])

  return {
    id: Number(order.id_order),
    reference: String(order.reference || ''),
    customerId: Number(order.id_customer || 0),
    status: String(order.state_name || ''),
    statusId: Number(order.current_state || 0),
    payment: String(order.payment || ''),
    totalPaidHT: Number(order.total_paid_tax_excl || 0),
    totalPaidTTC: Number(order.total_paid_tax_incl || order.total_paid || 0),
    totalShipping: Number(order.total_shipping_tax_incl || order.total_shipping || 0),
    
    
    
    
    totalShippingHT:   Number(order.total_shipping_tax_excl || 0),
    shippingTaxRate:   Number(order.carrier_tax_rate || 0),
    totalDiscountsHT:  Number(order.total_discounts_tax_excl || 0),
    totalDiscountsTTC: Number(order.total_discounts_tax_incl || 0),
    discountLabel:     String(order.discount_label || ''),
    
    
    
    
    
    
    totalProducts: Number(order.total_products || order.total_products_wt || 0),
    items: items.map((r: any): OrderItemData => {
      const priceHT = Number(r.unit_price_tax_excl || 0)
      const original = Number(r.original_product_price || 0)
      const hasPromo = original > 0 && original > priceHT + 0.001
      const reductionPercent = Number(r.reduction_percent || 0)
      const reductionAmount = Number(r.reduction_amount || 0)
      let reductionLabel: string | undefined
      if (hasPromo) {
        if (reductionPercent > 0) {
          reductionLabel = `-${Math.round(reductionPercent * 100)}%`
        } else if (reductionAmount > 0) {
          reductionLabel = `-${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(reductionAmount)}`
        } else {
          
          
          const ratio = (original - priceHT) / original
          reductionLabel = `-${Math.round(ratio * 100)}%`
        }
      }
      
      
      
      
      
      const pricing = unitPricing
        ? deriveUnitPricing({
          priceHT,
          unitPriceRatio: r.unit_price_ratio,
          unity: r.unity,
          unitsPerPack: undefined,
          netWeightKg: undefined,
          productWeightKg: Number(r.weight || 0),
        })
        : { pricePerUnit: undefined, unitLabel: undefined }
      const attributesLabel = String(r.attributes_label || '').trim()
      return {
        productId: Number(r.product_id),
        combinationId: Number(r.product_attribute_id || 0),
        name: String(r.product_name || ''),
        reference: String(r.product_reference || ''),
        quantity: Number(r.product_quantity || 0),
        priceHT,
        priceTTC: Number(r.unit_price_tax_incl || 0),
        priceHTBeforeDiscount: hasPromo ? original : undefined,
        reductionLabel,
        image: buildProductImage(Number(r.id_image), r.link_rewrite)?.src,
        attributes: attributesLabel ? attributesLabel.split(' | ') : undefined,
        unitLabel:             pricing.unitLabel,
        pricePerUnitFormatted: pricing.pricePerUnit !== undefined ? formatEurFr(pricing.pricePerUnit) : undefined,
      }
    }),
    dateAdd: String(order.date_add || ''),
    addressDelivery,
    addressInvoice,
    invoiceNumber: order.invoice_number ? String(order.invoice_number) : undefined,
    invoiceDate: order.invoice_date && String(order.invoice_date) !== '0000-00-00 00:00:00' ? String(order.invoice_date) : undefined,
  }
}

export async function getOrdersForCustomer(customerId: number, limit: number, ctx: OrdersContext = {}): Promise<OrderData[]> {
  const idRows = rows<any>(await db(ctx).execute(sql`
    SELECT id_order FROM cs_main.ps_orders WHERE id_customer = ${customerId}
     ORDER BY date_add DESC LIMIT ${limit}
  `))
  const orders: OrderData[] = []
  for (const r of idRows) {
    const o = await getOrderFromDb(Number(r.id_order), ctx)
    if (o) orders.push(o)
  }
  return orders
}

export async function getOrderHistoryFromDb(orderId: number, ctx: OrdersContext = {}) {
  return rows<any>(await db(ctx).execute(sql`
    SELECT oh.id_order_history, oh.id_order_state, oh.date_add,
           COALESCE(osl.name, '') AS state_name
      FROM cs_main.ps_order_history oh
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = oh.id_order_state AND osl.id_lang = 1
     WHERE oh.id_order = ${orderId}
     ORDER BY oh.date_add ASC
  `))
}

export async function getOrderStatesFromDb(ctx: OrdersContext = {}): Promise<OrderState[]> {
  const stateRows = rows<any>(await db(ctx).execute(sql`
    SELECT os.id_order_state, os.color, os.delivery, os.paid, os.shipped,
           COALESCE(osl.name, '') AS name
      FROM cs_main.ps_order_state os
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = os.id_order_state AND osl.id_lang = 1
     WHERE os.deleted = 0
     ORDER BY os.id_order_state
  `))
  return stateRows.map((r: any) => ({
    id: Number(r.id_order_state),
    name: String(r.name || ''),
    color: String(r.color || ''),
    delivery: Number(r.delivery) === 1,
    paid: Number(r.paid) === 1,
    shipped: Number(r.shipped) === 1,
  }))
}

export async function getCarriersFromDb(
  idLang = 1,
  filters: { addressId?: number; countryId?: number; totalHT?: number; weight?: number; customerId?: number } = {},
  ctx: OrdersContext = {},
): Promise<CarrierSummary[]> {
  const d = db(ctx)
  let idZone: number | null = null
  let addressCountryId = 0
  let addressPostcode  = ''
  let addressVatNumber = ''

  if (filters.addressId) {
    const addr = await d.execute(sql`
      SELECT co.id_zone, a.id_country, a.postcode, a.vat_number
        FROM cs_main.ps_address a
        JOIN cs_main.ps_country co ON co.id_country = a.id_country
       WHERE a.id_address = ${filters.addressId} AND a.deleted = 0
       LIMIT 1
    `).then(first<any>)
    idZone = addr?.id_zone ? Number(addr.id_zone) : null
    addressCountryId = Number(addr?.id_country || 0)
    addressPostcode  = String(addr?.postcode || '').trim()
    addressVatNumber = String(addr?.vat_number || '').trim()
  } else {
    
    
    const cid = filters.countryId ? Number(filters.countryId) : null
    const defCountry = await d.execute(sql`
      SELECT id_country, id_zone FROM cs_main.ps_country
       WHERE id_country = COALESCE(${cid}, (SELECT CAST(NULLIF(value, '') AS integer) FROM cs_main.ps_configuration WHERE name = 'PS_COUNTRY_DEFAULT' LIMIT 1), 8)
       LIMIT 1
    `).then(first<any>).catch(() => null)
    if (defCountry) {
      addressCountryId = Number(defCountry.id_country || 8)
      idZone = Number(defCountry.id_zone || 1)
    }
  }

  const carrierRows = rows<any>(await d.execute(sql`
    SELECT c.id_carrier, c.name, c.active, c.is_free, c.shipping_method, c.range_behavior,
           COALESCE(cl.delay, '') AS delay
      FROM cs_main.ps_carrier c
 LEFT JOIN cs_main.ps_carrier_lang cl ON cl.id_carrier = c.id_carrier AND cl.id_lang = ${idLang}
     WHERE c.active = 1 AND c.deleted = 0
     ORDER BY c.position
  `))

  
  
  let autoliqOrExport = false
  if (addressCountryId && addressCountryId !== 8) {
    const ctxRow: any = await d.execute(sql`
      SELECT
        (SELECT iso_code FROM cs_main.ps_country WHERE id_country = ${addressCountryId} LIMIT 1) AS iso,
        (SELECT is_valid FROM cs_main.cs_vat_intracom_cache
          WHERE vat_number = ${addressVatNumber.toUpperCase().replace(/[\s.\-]/g, '')}
            AND expires_at > NOW() LIMIT 1) AS vat_valid
    `).then(first<any>).catch(() => null)
    const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','DE'])
    const iso = String(ctxRow?.iso || '')
    if (iso && !EU.has(iso)) autoliqOrExport = true                       
    else if (iso && EU.has(iso) && Number(ctxRow?.vat_valid) === 1) autoliqOrExport = true  
  }

  
  
  
  
  
  const francoRules = await listActiveFreightRules()
  const customerGroups = francoRules.some(r => r.scope === 'customer_group')
    ? await loadCustomerPriceGroups(filters.customerId)
    : []

  const out: CarrierSummary[] = []
  
  
  const clickCollect = new Set<number>(rows<any>(await d.execute(sql`
    SELECT c.id_carrier FROM cs_main.ps_carrier c
      JOIN cs_main.cs_carrier_meta m ON m.id_carrier_reference = c.id_reference
     WHERE m.is_click_collect = 1
  `).catch(() => [])).map(r => Number(r.id_carrier)))

  for (const r of carrierRows) {
    const idCarrier = Number(r.id_carrier)
    const isFree = Number(r.is_free) === 1
    const shippingMethod = Number(r.shipping_method)
    const rangeBehavior = Number(r.range_behavior)

    if (idZone) {
      const zoneOk = await d.execute(sql`
        SELECT 1 AS ok FROM cs_main.ps_carrier_zone WHERE id_carrier = ${idCarrier} AND id_zone = ${idZone} LIMIT 1
      `).then(first<any>)
      if (!zoneOk) continue
    }

    let price = 0
    if (!isFree) {
      const value = shippingMethod === 1 ? Number(filters.weight ?? 0) : Number(filters.totalHT ?? 0)
      const rangeTable = shippingMethod === 1 ? sql.raw('cs_main.ps_range_weight') : sql.raw('cs_main.ps_range_price')
      const rangeFkCol = shippingMethod === 1 ? sql.raw('id_range_weight') : sql.raw('id_range_price')

      let range = await d.execute(sql`
        SELECT ${rangeFkCol} AS id_range, delimiter1, delimiter2
           FROM ${rangeTable}
          WHERE id_carrier = ${idCarrier} AND delimiter1 <= ${value} AND delimiter2 > ${value}
          ORDER BY delimiter1 DESC LIMIT 1
      `).then(first<any>)
      if (!range && rangeBehavior === 0) {
        range = await d.execute(sql`
          SELECT ${rangeFkCol} AS id_range, delimiter1, delimiter2
             FROM ${rangeTable}
            WHERE id_carrier = ${idCarrier}
            ORDER BY delimiter2 DESC LIMIT 1
        `).then(first<any>)
      }
      if (!range) continue

      const delivery = idZone
        ? await d.execute(sql`
            SELECT price FROM cs_main.ps_delivery
              WHERE id_carrier = ${idCarrier} AND ${rangeFkCol} = ${range.id_range} AND id_zone = ${idZone} LIMIT 1
          `).then(first<any>)
        : await d.execute(sql`
            SELECT price FROM cs_main.ps_delivery
              WHERE id_carrier = ${idCarrier} AND ${rangeFkCol} = ${range.id_range} LIMIT 1
          `).then(first<any>)
      if (!delivery) continue
      price = Number(delivery.price)
    }

    
    
    
    let francoRule: CarrierSummary['francoRule'] = null
    if (!isFree && price > 0) {
      const winner = pickFreightRule(francoRules, {
        amount: Number(filters.totalHT ?? 0),
        weight: Number(filters.weight ?? 0),
        carrier: idCarrier,
        zone: idZone ?? 0,
        groups: customerGroups,
      })
      if (winner) {
        price = 0
        francoRule = { id: winner.id, label: winner.label }
      }
    }

    
    
    
    
    let taxRate = 0
    if (!isFree && price > 0 && addressCountryId && !autoliqOrExport) {
      const trg: any = await d.execute(sql`
        SELECT id_tax_rules_group FROM cs_main.ps_carrier_tax_rules_group_shop
         WHERE id_carrier = ${idCarrier} LIMIT 1
      `).then(first<any>).catch(() => null)
      const trgId = Number(trg?.id_tax_rules_group || 0)
      if (trgId) {
        const rateRow: any = await d.execute(sql`
          SELECT COALESCE(
            (SELECT t.rate FROM cs_main.ps_tax_rule tr2
               JOIN cs_main.ps_tax t ON t.id_tax = tr2.id_tax
              WHERE tr2.id_tax_rules_group = ${trgId}
                AND tr2.id_country = ${addressCountryId}
                AND t.active = 1
                AND tr2.zipcode_from <> '' AND tr2.zipcode_from <> '0'
                AND ${addressPostcode} BETWEEN tr2.zipcode_from AND tr2.zipcode_to
              LIMIT 1),
            (SELECT t.rate FROM cs_main.ps_tax_rule tr1
               JOIN cs_main.ps_tax t ON t.id_tax = tr1.id_tax
              WHERE tr1.id_tax_rules_group = ${trgId}
                AND tr1.id_country = ${addressCountryId}
                AND t.active = 1
                AND (tr1.zipcode_from = '' OR tr1.zipcode_from = '0')
              LIMIT 1),
            0
          ) AS rate
        `).then(first<any>).catch(() => null)
        taxRate = Number(rateRow?.rate || 0)
      }
      
      
      
      
      
      
      
      
      if (taxRate === 0) {
        console.warn(
          `[shipping-tax] carrier #${idCarrier} payant (${price}) mais TVA résolue à 0 % — `
          + `vérifier ps_carrier_tax_rules_group_shop et ps_tax_rule (pays ${addressCountryId}). `
          + `Frais de port facturés HT.`,
        )
      }
    }
    const priceTTC = price * (1 + taxRate / 100)

    out.push({
      id: idCarrier,
      name: String(r.name || ''),
      delay: String(r.delay || ''),
      price,
      priceTTC,
      taxRate,
      freeAbove: null,
      active: true,
      isFree,
      isClickCollect: clickCollect.has(idCarrier),
      francoRule,
    })
  }
  return out
}

export async function createOrderFromCart(
  params: {
    cartId: number
    customerId: number
    addressDeliveryId: number
    addressInvoiceId: number
    carrierId: number
    paymentMethod: string
    currencyId?: number
    langId?: number
  },
  ctx: OrdersContext = {},
): Promise<{ id: number; reference: string } | null> {
  const { cartId, customerId, addressDeliveryId, addressInvoiceId, carrierId, paymentMethod } = params
  const currencyId = params.currencyId || 1
  const langId = params.langId || 1
  const d = db(ctx)

  
  
  const perso = colonnesPersonnalisation(await tablePersonnalisationPresente(d))
  const items = rows<any>(await d.execute(sql`
    SELECT cp.id_product, cp.id_product_attribute, cp.quantity, cp.id_customization,
           ${perso.colonnes}
           COALESCE(pl.name, plf.name, '') AS name,
           -- Codes article recopiés sur la ligne de commande, comme PrestaShop :
           -- ceux de la déclinaison priment, ceux du produit à défaut. Google Avis
           -- clients en tire les GTIN des avis produits (api/checkout/avis-google) ;
           -- la référence fournisseur dit quel article commander chez le
           -- fournisseur, même quand deux produits partagent une référence.
           COALESCE(NULLIF(pa.reference, ''), p.reference, '') AS reference,
           COALESCE(NULLIF(pa.supplier_reference, ''), p.supplier_reference, '') AS supplier_reference,
           COALESCE(NULLIF(pa.ean13, ''), p.ean13, '') AS ean13,
           COALESCE(p.isbn, '') AS isbn,
           COALESCE(p.upc, '') AS upc,
           COALESCE(p.weight, 0) AS weight,
           ps.price,
           COALESCE(pa.price, 0) AS price_impact
      FROM cs_main.ps_cart_product cp
      JOIN cs_main.ps_product p ON p.id_product = cp.id_product
      JOIN cs_main.ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
 LEFT JOIN cs_main.ps_product_attribute pa ON pa.id_product_attribute = cp.id_product_attribute
 LEFT JOIN cs_main.ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ${langId} AND pl.id_shop = 1
 LEFT JOIN cs_main.ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
     ${perso.jointure}
     WHERE cp.id_cart = ${cartId}
  `))
  if (!items.length) return null

  
  
  
  
  const stocks = await lireStocksLignes(d, items.map((it: any) => ({
    productId: Number(it.id_product), comboId: Number(it.id_product_attribute || 0),
  })))
  const enRupture = lignesEnRupture(items.map((it: any) => {
    const cle = `${Number(it.id_product)}-${Number(it.id_product_attribute || 0)}`
    return {
      ...(stocks.get(cle) ?? { quantite: null, outOfStock: null, defautBoutique: null, gestionStock: null, aDeclinaisons: false, idDeclinaison: 0 }),
      idProduit: Number(it.id_product),
      quantiteDemandee: Number(it.quantity || 0),
      nom: String(it.name || it.reference || it.id_product),
    }
  }))
  if (enRupture.length) {
    throw createError({
      statusCode: 409,
      message: (await t('checkout.error_out_of_stock_lines', langId,
        'Stock insuffisant pour : {produits}. Retirez-les ou baissez la quantité dans votre panier.'))
        .replace('{produits}', enRupture.join(', ')),
    })
  }

  
  
  
  const productIds = items.map((it: any) => Number(it.id_product))
  const specificPrices = await getSpecificPriceTiers(productIds, ctx)

  
  
  
  
  const deliveryAddr = first<any>(await d.execute(sql`
    SELECT id_country, postcode, vat_number FROM cs_main.ps_address
     WHERE id_address = ${addressDeliveryId} LIMIT 1
  `))
  const countryId = Number(deliveryAddr?.id_country || 8)
  const postcode = String(deliveryAddr?.postcode || '')
  const vatNumber = String(deliveryAddr?.vat_number || '')
  const taxRates = await getTaxRatesForProducts(productIds, countryId, ctx, postcode, vatNumber)

  
  
  
  
  const roundUpRow = first<any>(await d.execute(sql`
    SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_PRICE_ROUND_UP' LIMIT 1`))
  const roundUp = roundUpRow?.value === '1'

  const itemPricing = items.map((r: any) => {
    
    
    const fee = r.custom_kind ? Number(r.custom_fee || 0) : 0
    const basePrice = Number(r.price) + Number(r.price_impact || 0) + fee
    
    
    const sp = pickTierForQuantity(specificPrices.get(Number(r.id_product)), Number(r.quantity || 1))
    const rawFinalPrice = prixLigneHT(basePrice - fee, sp, fee)
    const taxRate = taxRates.get(Number(r.id_product)) ?? 0
    const finalPriceTTC = roundDisplayPrice(rawFinalPrice * (1 + taxRate / 100), roundUp)
    
    const finalPrice = (roundUp && taxRate > 0)
      ? finalPriceTTC / (1 + taxRate / 100)
      : rawFinalPrice
    return { row: r, basePrice, finalPrice, finalPriceTTC, taxRate, sp }
  })

  const totalProductsHT = itemPricing.reduce((s: number, ip) =>
    s + ip.finalPrice * Number(ip.row.quantity), 0)
  const totalProductsTTC = itemPricing.reduce((s: number, ip) =>
    s + ip.finalPriceTTC * Number(ip.row.quantity), 0)

  
  
  
  
  
  const minRow: any[] = (await d.execute(sql`
    SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_PURCHASE_MINIMUM' LIMIT 1
  `).catch(() => [])) as any[]
  const purchaseMinimumHt = Number(minRow?.[0]?.value || 0)
  if (purchaseMinimumHt > 0 && totalProductsHT < purchaseMinimumHt) {
    throw createError({
      statusCode: 422,
      statusMessage: 'purchase_minimum_not_reached',
      message: `Minimum de commande non atteint : ${purchaseMinimumHt}€ HT requis, panier à ${totalProductsHT.toFixed(2)}€ HT.`,
      data: { purchaseMinimumHt, totalProductsHt: totalProductsHT },
    })
  }

  
  let shippingPrice = 0
  if (carrierId) {
    const totalWeight = items.reduce((sum: number, it: any) => sum + (Number(it.weight || 0) * Number(it.quantity || 1)), 0)
    const carriers = await getCarriersFromDb(langId, { addressId: addressDeliveryId, totalHT: totalProductsHT, weight: totalWeight, customerId }, ctx)
    const c = carriers.find((cc: any) => cc.id === Number(carrierId))
    if (c) shippingPrice = Number(c.price || 0)
  }

  
  
  
  
  let shippingTaxRate = 0
  if (carrierId && shippingPrice > 0) {
    
    
    
    const allZero = Array.from(taxRates.values()).every(r => r === 0)
    if (allZero && countryId !== 8) {
      
      shippingTaxRate = 0
    } else {
    const trgRow: any[] = (await d.execute(sql`
      SELECT id_tax_rules_group FROM cs_main.ps_carrier_tax_rules_group_shop
       WHERE id_carrier = ${Number(carrierId)} LIMIT 1
    `).catch(() => [])) as any[]
    const trgId = Number(trgRow?.[0]?.id_tax_rules_group || 0)
    if (trgId) {
      const addrRow: any[] = (await d.execute(sql`
        SELECT id_country, postcode FROM cs_main.ps_address
         WHERE id_address = ${Number(addressDeliveryId)} LIMIT 1
      `).catch(() => [])) as any[]
      const countryId2 = Number(addrRow?.[0]?.id_country || 8)
      const pc = String(addrRow?.[0]?.postcode || '').trim()
      const rateRow: any[] = (await d.execute(sql`
        SELECT COALESCE(
          (SELECT t.rate FROM cs_main.ps_tax_rule tr2
             JOIN cs_main.ps_tax t ON t.id_tax = tr2.id_tax
            WHERE tr2.id_tax_rules_group = ${trgId}
              AND tr2.id_country = ${countryId}
              AND t.active = 1
              AND tr2.zipcode_from <> '' AND tr2.zipcode_from <> '0'
              AND ${pc} BETWEEN tr2.zipcode_from AND tr2.zipcode_to
            LIMIT 1),
          (SELECT t.rate FROM cs_main.ps_tax_rule tr1
             JOIN cs_main.ps_tax t ON t.id_tax = tr1.id_tax
            WHERE tr1.id_tax_rules_group = ${trgId}
              AND tr1.id_country = ${countryId}
              AND t.active = 1
              AND (tr1.zipcode_from = '' OR tr1.zipcode_from = '0')
            LIMIT 1),
          0
        ) AS rate
      `).catch(() => [])) as any[]
      shippingTaxRate = Number(rateRow?.[0]?.rate || 0)
    }
    
    
    if (shippingTaxRate === 0) {
      console.warn(
        `[shipping-tax] commande : carrier #${carrierId} payant (${shippingPrice}) mais `
        + `TVA résolue à 0 % — frais de port facturés HT. Vérifier `
        + `ps_carrier_tax_rules_group_shop / ps_tax_rule.`,
      )
    }
    }
  }
  let shippingPriceTTC = shippingPrice * (1 + shippingTaxRate / 100)

  
  const ruleRows = await d.execute(sql`
    SELECT cr.id_cart_rule, cr.reduction_amount, cr.reduction_percent
       FROM cs_main.ps_cart_cart_rule ccr
       JOIN cs_main.ps_cart_rule cr ON cr.id_cart_rule = ccr.id_cart_rule
      WHERE ccr.id_cart = ${cartId}
  `).then(rows<any>).catch(() => [] as any[])
  let discountAmount = ruleRows.reduce((s: number, r: any) => {
    const fixed = Number(r.reduction_amount || 0)
    const pct = Number(r.reduction_percent || 0)
    return s + (fixed > 0 ? fixed : pct > 0 ? totalProductsHT * (pct / 100) : 0)
  }, 0)

  
  
  
  const taxRatio = totalProductsHT > 0 ? totalProductsTTC / totalProductsHT : 1
  let discountAmountTTC = discountAmount * taxRatio
  const totalExclAfterDiscount = Math.max(0, totalProductsHT - discountAmount)
  const totalInclAfterDiscount = Math.max(0, totalProductsTTC - discountAmountTTC)
  
  
  let totalPaidHT  = totalExclAfterDiscount + shippingPrice
  let totalPaidTTC = totalInclAfterDiscount + shippingPriceTTC

  
  
  
  ;({ discountAmount, discountAmountTTC, shippingPrice, shippingPriceTTC, totalPaidHT, totalPaidTTC } =
    await applyFilter<FilterCartTotalsValue>(HOOKS_FILTER.CART_TOTALS, {
      discountAmount, discountAmountTTC, shippingPrice, shippingPriceTTC, totalPaidHT, totalPaidTTC,
    }, { cartId }))

  const reference = 'AC' + Math.random().toString(36).toUpperCase().slice(2, 10)
  const secureKey = Math.random().toString(36).slice(2, 34)

  
  
  
  
  
  
  
  
  
  
  
  
  
  const initialState = initialOrderStateFor(paymentMethod)

  const insertResult: any = await d.execute(sql`
    INSERT INTO cs_main.ps_orders
        (id_address_delivery, id_address_invoice, id_cart, id_currency, id_lang,
         id_customer, id_carrier, current_state, secure_key, payment, conversion_rate,
         module, reference, recyclable, gift, gift_message, mobile_theme,
         total_discounts, total_discounts_tax_incl, total_discounts_tax_excl,
         total_paid, total_paid_tax_incl, total_paid_tax_excl, total_paid_real,
         total_products, total_products_wt,
         total_shipping, total_shipping_tax_incl, total_shipping_tax_excl,
         carrier_tax_rate, total_wrapping, total_wrapping_tax_incl, total_wrapping_tax_excl,
         round_mode, round_type, invoice_number, delivery_number,
         invoice_date, delivery_date,
         valid, date_add, date_upd)
     VALUES (${addressDeliveryId}, ${addressInvoiceId}, ${cartId}, ${currencyId}, ${langId},
             ${customerId}, ${carrierId || 0}, ${initialState}, ${secureKey}, ${paymentMethod}, 1.0,
             'checkout', ${reference}, 1, 0, '', 0,
             ${discountAmount}, ${discountAmountTTC}, ${discountAmount},
             ${totalPaidTTC}, ${totalPaidTTC}, ${totalPaidHT}, 0,
             ${totalProductsHT}, ${totalProductsTTC},
             ${shippingPriceTTC}, ${shippingPriceTTC}, ${shippingPrice},
             ${shippingTaxRate}, 0, 0, 0,
             2, 2, 0, 0,
             NULL, NULL,
             0, NOW(), NOW())
     RETURNING id_order
  `)
  const orderId = Number(insertResult?.[0]?.id_order ?? 0)

  
  
  const libellesPerso = itemPricing.some(ip => ip.row.custom_kind)
    ? {
        textile: await t('product.personalize_cart_line', langId, 'Flocage'),
        racket: await t('product.racket_config_line', langId, 'Cordage'),
      }
    : null

  for (const ip of itemPricing) {
    const it = ip.row
    
    
    const mention = libellesPerso ? mentionPersonnalisation({
      kind: it.custom_kind, text: it.custom_text, color_label: it.custom_color_label,
    }, libellesPerso) : ''
    const productName = mention ? `${String(it.name)} — ${mention}` : String(it.name)
    const customizationId = it.custom_kind ? Number(it.id_customization || 0) : 0
    const unit    = ip.finalPrice
    const unitTTC = ip.finalPriceTTC
    const original = ip.basePrice
    const qty = Number(it.quantity)
    const rate = ip.taxRate
    
    
    
    
    const reductionPercent = ip.sp?.reductionType === 'percentage' ? Number(ip.sp.reduction) : 0
    const reductionAmount  = ip.sp?.reductionType === 'amount'     ? Number(ip.sp.reduction) : 0
    const reductionUnit    = Math.max(0, original - unit)
    const reductionUnitTTC = reductionUnit * (1 + rate / 100)
    await d.execute(sql`
      INSERT INTO cs_main.ps_order_detail
          (id_order, id_order_invoice, id_warehouse, id_shop, product_id, product_attribute_id,
           id_customization, product_name, product_quantity, product_quantity_in_stock, product_price,
           product_reference, product_supplier_reference, unit_price_tax_incl, unit_price_tax_excl,
           total_price_tax_incl, total_price_tax_excl,
           original_product_price, reduction_percent, reduction_amount,
           reduction_amount_tax_incl, reduction_amount_tax_excl,
           group_reduction, ecotax, tax_rate, tax_computation_method,
           discount_quantity_applied,
           product_weight, product_ean13, product_isbn, product_upc, product_mpn,
           product_quantity_refunded, product_quantity_return, product_quantity_reinjected)
       VALUES (${orderId}, 0, 0, 1, ${Number(it.id_product)}, ${Number(it.id_product_attribute || 0)},
               ${customizationId}, ${productName}, ${qty}, ${qty}, ${unit},
               ${String(it.reference || '')}, ${String(it.supplier_reference || '')}, ${unitTTC}, ${unit}, ${unitTTC * qty}, ${unit * qty},
               ${original}, ${reductionPercent}, ${reductionAmount},
               ${reductionUnitTTC}, ${reductionUnit},
               0, 0, ${rate}, 0, 0,
               0, ${String(it.ean13 || '')}, ${String(it.isbn || '')}, ${String(it.upc || '')}, '',
               0, 0, 0)
    `)

    
    await d.execute(sql`
      UPDATE cs_main.ps_stock_available
          SET quantity           = quantity - ${qty},
              physical_quantity  = physical_quantity - ${qty}
        WHERE id_product = ${Number(it.id_product)}
          AND id_product_attribute = ${Number(it.id_product_attribute || 0)}
    `)
    
    await d.execute(sql`
      INSERT INTO cs_main.ps_stock_mvt
          (id_stock, id_order, id_supply_order, id_stock_mvt_reason, id_employee,
           employee_lastname, employee_firstname, physical_quantity, sign, date_add,
           price_te, last_wa, current_wa, referer)
       SELECT sa.id_stock_available, ${orderId}, 0, 11, 0, '', '', ${qty}, -1, NOW(), 0, 0, 0, 0
         FROM cs_main.ps_stock_available sa
        WHERE sa.id_product = ${Number(it.id_product)} AND sa.id_product_attribute = ${Number(it.id_product_attribute || 0)}
        LIMIT 1
    `).catch(() => {  })
  }

  await d.execute(sql`
    INSERT INTO cs_main.ps_order_history (id_employee, id_order, id_order_state, date_add)
     VALUES (0, ${orderId}, ${initialState}, NOW())
  `)

  
  
  
  
  await promoteOrderValid(d, orderId, initialState)
  await issueOrderInvoice(d, orderId, initialState).catch((err: any) => {
    console.error(`[orders-db] issueOrderInvoice échoué order=#${orderId}:`, err?.message || err)
  })

  
  
  
  for (const r of ruleRows as any[]) {
    const ruleId = Number(r.id_cart_rule)
    if (!ruleId) continue
    const fixed = Number(r.reduction_amount || 0)
    const pct = Number(r.reduction_percent || 0)
    const ruleAmount = fixed > 0 ? fixed : pct > 0 ? totalProductsHT * (pct / 100) : 0
    
    const nameRow: any[] = await d.execute(sql`
      SELECT COALESCE(crl.name, cr.code, '') AS name
        FROM cs_main.ps_cart_rule cr
        LEFT JOIN cs_main.ps_cart_rule_lang crl
          ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = 1
       WHERE cr.id_cart_rule = ${ruleId} LIMIT 1
    `).catch(() => [] as any[]) as any[]
    const ruleName = String(nameRow?.[0]?.name || '')
    const ruleAmountTTC = ruleAmount * taxRatio
    await d.execute(sql`
      INSERT INTO cs_main.ps_order_cart_rule
          (id_order, id_cart_rule, id_order_invoice, name, value, value_tax_excl, free_shipping, deleted)
       VALUES (${orderId}, ${ruleId}, 0, ${ruleName}, ${ruleAmountTTC}, ${ruleAmount}, 0, 0)
    `).catch((err: any) => {
      console.error(`[createOrderFromCart] ps_order_cart_rule insert failed for rule ${ruleId}:`, err?.message || err)
    })
  }

  
  
  callAction<ActionOrderCreatedPayload>(HOOKS_ACTION.ORDER_CREATED, {
    orderId,
    orderReference: reference,
    totalCents: Math.round(totalPaidTTC * 100),
  }).catch((err: any) => {
    console.error(`[createOrderFromCart] hook '${HOOKS_ACTION.ORDER_CREATED}' failed:`, err?.message)
  })

  return { id: orderId, reference }
}
