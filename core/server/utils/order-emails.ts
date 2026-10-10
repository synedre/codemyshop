

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sendEmailViaQueue } from './email-queue'
import { loadEmailTemplate, resolveAdminRecipients, type LoadedEmailTemplate } from './email-template-loader'
import { renderEmailTemplate } from './email-template-render'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'
import { unescapeDbText } from '~/server/utils/db-text-unescape'
import { resolveVatContext } from '~/server/utils/vat-legal-mention'
import { readCompanyId } from '~/server/utils/company-id'
import { quoteItemsLabel, quoteAckSummaryHtml } from '~/server/utils/quote-items-mention'
import { buildOrderEmailTotals, buildCustomerEmailTotals } from '~/utils/order-email-totals'
import type { OrderData } from '~/server/connectors/base'

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const formatNumberFr = (n: number, frac = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(n)
const escAttr = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] || c))

function buildShopBaseUrl(historyUrl?: string): string {
  if (!historyUrl || historyUrl === '#' || historyUrl.startsWith('#')) return ''
  const m = historyUrl.match(/^(.+?)\/mon-compte\/commandes\/\d+$/)
  return m?.[1] || ''
}

function buildLoginHistoryUrl(historyUrl?: string): string {
  const baseUrl = buildShopBaseUrl(historyUrl)
  if (!baseUrl) return '#'
  return `${baseUrl}/connexion?next=/mon-compte/commandes`
}

function promoLineHtml(item: OrderData['items'][number]): string {
  if (!item.priceHTBeforeDiscount && !item.reductionLabel) return ''
  const barred = item.priceHTBeforeDiscount
    ? `<span style="text-decoration:line-through;color:#dc2626;">${formatPrice(item.priceHTBeforeDiscount)} HT</span>`
    : ''
  const badge = item.reductionLabel
    ? `<span style="display:inline-block;background:#dc2626;color:white;font-weight:700;font-size:10px;padding:1px 6px;border-radius:9999px;margin-left:6px;">${item.reductionLabel}</span>`
    : ''
  return `<div style="margin-top:2px;font-size:11px;">${barred}${badge}</div>`
}

export async function fetchOrderAdminItemsDetails(orderId: number, ctx: { clientId?: string } = {}) {
  const d = usePocPg()
  const rows = await d.execute(sql`
    SELECT od.id_order_detail, od.product_id, od.product_reference, od.product_name,
           od.product_quantity, od.unit_price_tax_excl, od.original_product_price,
           od.reduction_percent, od.reduction_amount, od.tax_rate,
           p.unit_price_ratio, p.unity, p.weight,
           feat.packaging, feat.caliber, feat.units_per_pack, feat.net_weight
      FROM cs_main.ps_order_detail od
      LEFT JOIN cs_main.ps_product p ON p.id_product = od.product_id
      LEFT JOIN (
        SELECT fp.id_product,
               MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
               MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
               MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS units_per_pack,
               MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS net_weight
          FROM cs_main.ps_feature_product fp
          JOIN cs_main.ps_feature_lang        fl  ON fl.id_feature        = fp.id_feature        AND fl.id_lang  = 1
          JOIN cs_main.ps_feature_value_lang  fvl ON fvl.id_feature_value = fp.id_feature_value  AND fvl.id_lang = 1
         WHERE fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
         GROUP BY fp.id_product
      ) feat ON feat.id_product = od.product_id
     WHERE od.id_order = ${orderId}
     ORDER BY od.id_order_detail
  `).catch((err: any) => {
    console.error('[fetchOrderAdminItemsDetails] query KO:', err?.message || err)
    return [] as any[]
  })
  return Array.isArray(rows) ? rows : []
}

function parseWeightToKgLocal(s: any): number | undefined {
  if (s == null) return undefined
  const str = String(s).toLowerCase().replace(',', '.').trim()
  const m = str.match(/(\d+(?:\.\d+)?)\s*(kg|g)?/)
  if (!m) return undefined
  const n = parseFloat(m[1])
  if (!Number.isFinite(n)) return undefined
  if (m[2] === 'g') return n / 1000
  return n
}

function buildAdminOrderProductsHtml(order: OrderData, details: any[]): string {
  const byProductId = new Map<number, any>()
  for (const r of details) byProductId.set(Number(r.product_id), r)

  const unitPricing = tenantHasUnitPricing()
  const rows = order.items.map((item) => {
    const extra = byProductId.get(item.productId)
    const packaging = extra?.packaging ? String(extra.packaging) : ''
    const netWeight = extra?.net_weight ? String(extra.net_weight) : ''
    const unitsPerPackRaw = extra?.units_per_pack ? Number(extra.units_per_pack) : NaN
    const unitsPerPack = Number.isFinite(unitsPerPackRaw) && unitsPerPackRaw > 1 ? unitsPerPackRaw : undefined
    const weightKg = Number(extra?.weight || 0)
    let format = ''
    if (unitsPerPack && netWeight) format = `${unitsPerPack} × ${netWeight}`
    else if (netWeight) format = netWeight
    else if (weightKg && weightKg > 0) {
      format = weightKg < 1 ? `${Math.round(weightKg * 1000)}g` : `${weightKg.toString().replace('.', ',')}kg`
    }
    const taxRate = Number(extra?.tax_rate ?? 0)
    const netWeightKg = parseWeightToKgLocal(netWeight)
    const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
    const pricing = unitPricing
      ? deriveUnitPricing({
        priceHT:          item.priceHT,
        unitPriceRatio:   extra?.unit_price_ratio,
        unity:            extra?.unity,
        unitsPerPack,
        netWeightKg:      totalNetKg,
        productWeightKg:  weightKg,
      })
      : { pricePerUnit: undefined, unitLabel: undefined }
    const unitPriceLabel = pricing.pricePerUnit !== undefined
      ? `${formatPrice(pricing.pricePerUnit)} <span style="color:#64748b;font-weight:600;">${pricing.unitLabel || item.unitLabel || 'HT/K'}</span>`
      : `${formatPrice(item.priceHT)} <span style="color:#64748b;font-weight:600;">HT/U</span>`

    
    const metaParts: string[] = []
    if (format) metaParts.push(format)
    if (packaging) metaParts.push(packaging)
    if (item.reference) metaParts.push(`Réf. ${item.reference}`)
    const metaLine = metaParts.length
      ? `<div style="margin-top:4px;font-size:11px;color:#64748b;">${escAttr(metaParts.join(' · '))}</div>`
      : ''

    
    const promoBlock = item.priceHTBeforeDiscount
      ? `<div style="margin-top:2px;font-size:11px;"><span style="text-decoration:line-through;color:#dc2626;">${formatPrice(item.priceHTBeforeDiscount)} HT</span>${item.reductionLabel ? `<span style="display:inline-block;background:#dc2626;color:white;font-weight:700;font-size:10px;padding:1px 6px;border-radius:9999px;margin-left:6px;">${escAttr(item.reductionLabel)}</span>` : ''}</div>`
      : ''

    const subtotalHT = item.priceHT * item.quantity
    const tvaAmount  = subtotalHT * (taxRate / 100)
    const tvaLine = taxRate > 0
      ? `<div style="margin-top:4px;font-size:11px;color:#64748b;">TVA à ${formatNumberFr(taxRate, 1)} %, soit pour ${item.quantity} ${item.quantity > 1 ? 'colis' : 'colis'} : ${formatPrice(tvaAmount)} HT</div>`
      : ''

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;vertical-align:top;">
          <div style="font-weight:600;">${escAttr(item.name)}</div>
          ${metaLine}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569;text-align:left;vertical-align:top;white-space:nowrap;">${escAttr(item.reference || '—')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#0f172a;vertical-align:top;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;white-space:nowrap;vertical-align:top;">
          ${unitPriceLabel}
          ${promoBlock}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;vertical-align:top;white-space:nowrap;">
          <div style="font-weight:600;">${formatPrice(subtotalHT)}</div>
          ${tvaLine}
        </td>
      </tr>`
  }).join('')

  
  
  
  
  
  
  
  
  const taxLines = details.map((d: any) => {
    const ht  = Number(d?.unitPriceTaxExcl ?? 0) * Number(d?.productQuantity ?? 0)
    const ttc = Number(d?.unitPriceTaxIncl ?? 0) * Number(d?.productQuantity ?? 0)
    return { rate: Number(d?.taxRate ?? 0), tva: Math.max(0, ttc - ht) }
  })
  const totals = buildOrderEmailTotals({
    totalProductsHT: Number(order.totalProducts || 0),
    totalPaidHT:     Number(order.totalPaidHT || 0),
    totalPaidTTC:    Number(order.totalPaidTTC || 0),
    shippingHT:      order.totalShippingHT,
    shippingTTC:     Number(order.totalShipping || 0),
    shippingTaxRate: order.shippingTaxRate,
    discountHT:      order.totalDiscountsHT,
    discountLabel:   order.discountLabel,
    taxLines,
  })
  
  
  
  if (!totals.isConsistent) {
    console.warn(
      `[order-email] commande #${order.reference} : le pied ne se recompose pas — `
      + `produits ${totals.productsHT} − remise ${totals.discountHT} + port HT `
      + `${totals.shippingHT} ≠ total_paid_tax_excl ${order.totalPaidHT}. `
      + `Vérifier total_discounts_tax_excl / total_shipping_tax_excl.`,
    )
  }
  const totalTVA = totals.totalTVA
  const totalTTC = totals.totalTTC
  const tvaRowsHtml = totals.tvaRows
    .map(({ rate, amount }) => `<tr>
      <td colspan="4" style="padding:4px 12px;text-align:right;font-size:11px;color:#94a3b8;">TVA ${formatNumberFr(rate, 1)} %</td>
      <td style="padding:4px 12px;text-align:right;font-size:12px;color:#475569;white-space:nowrap;">${formatPrice(amount)}</td>
    </tr>`).join('')
  
  
  const discountLine = totals.discountLabel
    ? `Remise «&nbsp;${escAttr(totals.discountLabel)}&nbsp;»`
    : 'Remise'
  const footer = `
    <tr>
      <td colspan="4" style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;border-top:2px solid #e2e8f0;">Total HT produits</td>
      <td style="padding:10px 12px;text-align:right;font-size:13px;color:#0f172a;border-top:2px solid #e2e8f0;white-space:nowrap;">${formatPrice(totals.productsHT)}</td>
    </tr>
    ${totals.shippingHT > 0 ? `<tr>
      <td colspan="4" style="padding:6px 12px;text-align:right;font-size:12px;color:#64748b;">Livraison HT</td>
      <td style="padding:6px 12px;text-align:right;font-size:13px;color:#0f172a;white-space:nowrap;">${formatPrice(totals.shippingHT)}</td>
    </tr>` : ''}
    ${totals.discountHT > 0.01 ? `<tr>
      <td colspan="4" style="padding:6px 12px;text-align:right;font-size:12px;color:#dc2626;font-weight:600;">${discountLine}</td>
      <td style="padding:6px 12px;text-align:right;font-size:13px;color:#dc2626;white-space:nowrap;font-weight:600;">−${formatPrice(totals.discountHT)}</td>
    </tr>` : ''}
    ${tvaRowsHtml}
    <tr>
      <td colspan="4" style="padding:6px 12px;text-align:right;font-size:12px;color:#64748b;border-top:1px dashed #e2e8f0;">TVA totale</td>
      <td style="padding:6px 12px;text-align:right;font-size:13px;color:#0f172a;white-space:nowrap;border-top:1px dashed #e2e8f0;">${formatPrice(totalTVA)}</td>
    </tr>
    <tr>
      <td colspan="4" style="padding:10px 12px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">Total TTC</td>
      <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;white-space:nowrap;">${formatPrice(totalTTC)}</td>
    </tr>`

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 8px;">
<thead>
<tr style="background:#f8fafc;">
<th style="padding:10px 12px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Produit</th>
<th style="padding:10px 12px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Réf.</th>
<th style="padding:10px 12px;text-align:center;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Qté</th>
<th style="padding:10px 12px;text-align:right;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">PU HT</th>
<th style="padding:10px 12px;text-align:right;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Sous-total HT</th>
</tr>
</thead>
<tbody>${rows}${footer}</tbody>
</table>`
}

function buildOrderProductsHtml(items: OrderData['items'], order?: OrderData): string {
  const rows = items.map((item) => {
    const ppu = item.pricePerUnitFormatted
    const ulabel = item.unitLabel || 'HT/K'
    const unitCell = ppu
      ? `${ppu}&nbsp;<span style="color:#64748b;font-weight:600;">${ulabel}</span>`
      : formatPrice(item.priceTTC)
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">
        ${item.name.replace(/[<>]/g, '')}
        ${promoLineHtml(item)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;white-space:nowrap;">${unitCell}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;">${formatPrice(item.priceTTC * item.quantity)}</td>
    </tr>
  `}).join('')

  
  
  let footer = ''
  if (order) {
    const productsTTC = items.reduce((s, it) => s + it.priceTTC * it.quantity, 0)
    const totals = buildCustomerEmailTotals({
      productsTTC,
      shippingTTC:   Number(order.totalShipping || 0),
      discountTTC:   order.totalDiscountsTTC,
      discountLabel: order.discountLabel,
      totalPaidTTC:  Number(order.totalPaidTTC || 0),
      lineCount:     items.length,
    })
    if (!totals.isConsistent) {
      console.warn(
        `[order-email] commande #${order.reference} : le pied client ne se recompose pas — `
        + `produits ${totals.productsTTC} + port ${totals.shippingTTC} − remise `
        + `${totals.discountTTC} ≠ total_paid_tax_incl ${totals.totalTTC}.`,
      )
    }
    const cell = 'padding:6px 12px;font-size:13px;'
    const line = (label: string, value: string, color = '#0f172a', weight = '400') => `
    <tr>
      <td colspan="3" style="${cell}text-align:right;color:${color === '#0f172a' ? '#64748b' : color};font-weight:${weight};">${label}</td>
      <td style="${cell}text-align:right;color:${color};white-space:nowrap;font-weight:${weight};">${value}</td>
    </tr>`
    const parts: string[] = []
    if (totals.shippingTTC > 0.01 || totals.discountTTC > 0.01) {
      parts.push(`
    <tr>
      <td colspan="3" style="${cell}text-align:right;color:#64748b;border-top:2px solid #e2e8f0;">Sous-total produits</td>
      <td style="${cell}text-align:right;color:#0f172a;white-space:nowrap;border-top:2px solid #e2e8f0;">${formatPrice(totals.productsTTC)}</td>
    </tr>`)
    }
    if (totals.shippingTTC > 0.01) parts.push(line('Livraison', formatPrice(totals.shippingTTC)))
    if (totals.discountTTC > 0.01) {
      const label = totals.discountLabel
        ? `Remise «&nbsp;${escAttr(totals.discountLabel)}&nbsp;»`
        : 'Remise'
      parts.push(line(label, `−${formatPrice(totals.discountTTC)}`, '#dc2626', '600'))
    }
    footer = parts.join('')
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
<thead>
<tr style="background:#f8fafc;">
<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Produit</th>
<th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Qté</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Prix unitaire</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Total TTC</th>
</tr>
</thead>
<tbody>${rows}${footer}</tbody>
</table>`
}

export async function sendOrderConfirmationEmail(
  order: OrderData,
  customerEmail: string,
  shopName = 'Boutique',
  accentColor = '#4F46E5',
  bankDetails?: { owner?: string; details?: string; address?: string; customText?: string },
  extras?: { carrierName?: string; historyUrl?: string; attachInvoiceForOrderId?: number },
) {
  
  
  const tpl = await loadEmailTemplate('order_confirmation', 1)
  if (tpl?.htmlBody) {
    const productsHtml = buildOrderProductsHtml(order.items, order)
    const isBankwireDb = order.payment.toLowerCase().includes('virement')
    const ribLine = isBankwireDb && bankDetails?.details
      ? `<br><strong>RIB :</strong> ${String(bankDetails.details).split('\n').join(' · ')}`
      : ''
    const subject = renderEmailTemplate(tpl.subject, {
      order_name: `#${order.reference}`,
      shop_name:  shopName,
    })
    const addr = order.addressDelivery
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname:           addr?.firstname || '',
      lastname:            addr?.lastname || '',
      order_name:          `#${order.reference}`,
      date:                new Date(order.dateAdd || Date.now()).toLocaleDateString('fr-FR'),
      products:            productsHtml,
      total_paid:          formatPrice(order.totalPaidTTC),
      total_products:      formatPrice(order.totalProducts),
      total_shipping:      formatPrice(order.totalShipping),
      delivery_block_html: addr
        ? `${addr.firstname || ''} ${addr.lastname || ''}<br>${addr.address1 || ''}<br>${addr.postcode || ''} ${addr.city || ''}`
        : '',
      
      payment:             order.payment + ribLine,
      
      
      carrier_block_html:  extras?.carrierName
        ? `<br>Transporteur&nbsp;: ${String(extras.carrierName).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] || c))}`
        : '',
      history_url:         extras?.historyUrl || '#',
      
      
      
      
      login_history_url:   buildLoginHistoryUrl(extras?.historyUrl),
      
      
      
      
      
      shop_url:            buildShopBaseUrl(extras?.historyUrl),
      shop_name:           shopName,
      primary_color:       accentColor,
    })
    
    
    
    
    
    const shouldAttach = extras?.attachInvoiceForOrderId != null
      ? !!extras.attachInvoiceForOrderId
      : tpl.attachInvoice
    const attachOrderId = extras?.attachInvoiceForOrderId ?? order.id
    const attachmentMeta = shouldAttach && attachOrderId
      ? ({ type: 'order_invoice_pdf' as const, orderId: attachOrderId })
      : undefined
    return sendEmailViaQueue({ to: customerEmail, subject, html, attachmentMeta })
  }

  
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;">
        ${item.name}
        ${promoLineHtml(item)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;">${formatPrice(item.priceTTC * item.quantity)}</td>
    </tr>
  `).join('')

  const isBankwire = order.payment.toLowerCase().includes('virement')
  const hasBankRib = !!(bankDetails?.details || bankDetails?.owner)
  const ribBlock = isBankwire && hasBankRib ? `
    <table style="width:100%;background:white;border:1px solid #bfdbfe;border-radius:6px;margin:12px 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;">
      ${bankDetails!.owner ? `<tr><td style="padding:8px 12px;color:#1e3a8a;width:120px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Bénéficiaire</td><td style="padding:8px 12px;color:#1e3a8a;font-weight:600;">${bankDetails!.owner}</td></tr>` : ''}
      ${bankDetails!.details ? `<tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Coordonnées</td><td style="padding:8px 12px;color:#1e3a8a;white-space:pre-line;">${bankDetails!.details}</td></tr>` : ''}
      ${bankDetails!.address ? `<tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Adresse banque</td><td style="padding:8px 12px;color:#1e3a8a;white-space:pre-line;">${bankDetails!.address}</td></tr>` : ''}
      <tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;border-top:1px solid #e2e8f0;">Référence</td><td style="padding:8px 12px;color:#1e3a8a;font-weight:700;border-top:1px solid #e2e8f0;">#${order.reference}</td></tr>
      <tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Montant</td><td style="padding:8px 12px;color:#1e3a8a;font-weight:700;">${formatPrice(order.totalPaidTTC)}</td></tr>
    </table>
  ` : ''

  const bankwireNote = isBankwire ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="font-weight:600;color:#1e40af;margin:0 0 8px;">Paiement par virement bancaire</p>
      <p style="font-size:14px;color:#1e40af;margin:0 0 4px;">
        ${hasBankRib
          ? `Effectuez votre virement avec les coordonnées ci-dessous, en indiquant la référence <strong>#${order.reference}</strong> en libellé.`
          : `Veuillez effectuer votre virement en indiquant la référence <strong>#${order.reference}</strong>.`}
      </p>
      ${ribBlock}
      <p style="font-size:13px;color:#1e40af;margin:8px 0 0;">Votre commande sera expédiée dès réception du paiement.</p>
    </div>
  ` : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:${accentColor};padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">Commande confirmée</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">${shopName}</p>
    </div>

    <div style="padding:32px;">
      <p style="font-size:16px;color:#1e293b;">
        Votre commande <strong>#${order.reference}</strong> a été enregistrée avec succès.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Produit</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Qté</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Total TTC</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-top:8px;">
        <table style="width:100%;">
          <tr>
            <td style="font-size:14px;color:#64748b;padding:4px 0;">Sous-total HT</td>
            <td style="font-size:14px;text-align:right;">${formatPrice(order.totalProducts)}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#64748b;padding:4px 0;">Livraison</td>
            <td style="font-size:14px;text-align:right;">${formatPrice(order.totalShipping)}</td>
          </tr>
          <tr>
            <td style="font-size:16px;font-weight:700;padding:8px 0 0;">Total TTC</td>
            <td style="font-size:16px;font-weight:700;text-align:right;color:${accentColor};padding:8px 0 0;">${formatPrice(order.totalPaidTTC)}</td>
          </tr>
        </table>
      </div>

      ${bankwireNote}

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;">
        <table style="width:100%;font-size:13px;color:#64748b;">
          <tr><td style="padding:2px 0;">Référence</td><td style="text-align:right;">#${order.reference}</td></tr>
          <tr><td style="padding:2px 0;">Paiement</td><td style="text-align:right;">${order.payment}</td></tr>
          <tr><td style="padding:2px 0;">Statut</td><td style="text-align:right;">${order.status}</td></tr>
        </table>
      </div>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
      ${shopName} — Cet email a été envoyé automatiquement suite à votre commande.
    </div>
  </div>
</body>
</html>`

  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Commande #${order.reference} confirmée — ${shopName}`,
    html,
  })
}

export async function sendWelcomeEmail(
  customerEmail: string,
  firstname: string,
  company: string,
  shopName = 'Boutique',
  shopUrl = '/',
  accentColor = '#4F46E5',
) {
  
  const tpl = await loadEmailTemplate('account_confirmation', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      company,
      email:         customerEmail,
      shop_name:     shopName,
      shop_url:      shopUrl,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:${accentColor};padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">Bienvenue chez ${shopName}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Votre compte est créé</p>
    </div>

    <div style="padding:32px;">
      <p style="font-size:16px;color:#1e293b;">
        Bonjour <strong>${firstname}</strong>,
      </p>
      <p style="font-size:14px;color:#475569;line-height:1.6;">
        Votre compte a été créé avec succès. Vous pouvez dès maintenant parcourir le catalogue et passer commande.
      </p>

      <div style="margin:24px 0;">
        <a href="${shopUrl}" style="display:inline-block;background:${accentColor};color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Accéder à votre espace
        </a>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:20px;">
        <p style="font-size:13px;color:#64748b;margin:0 0 8px;font-weight:600;">Votre compte vous permet de :</p>
        <ul style="font-size:13px;color:#64748b;margin:0;padding-left:20px;line-height:1.8;">
          <li>Découvrir le catalogue</li>
          <li>Passer commande en ligne</li>
          <li>Suivre vos commandes et télécharger vos factures</li>
        </ul>
      </div>

      <p style="font-size:13px;color:#94a3b8;margin-top:20px;">
        Email de connexion : <strong>${customerEmail}</strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
      ${shopName} — Cet email a été envoyé automatiquement suite à la création de votre compte.
    </div>
  </div>
</body>
</html>`

  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Bienvenue chez ${shopName} — Votre compte est prêt`,
    html,
  })
}

async function sendAdminTemplate(
  slug: string,
  fallbackSubject: string,
  fallbackHtml:    string,
  vars:            Record<string, string | number | undefined | null>,
  sourceHost?:     string | null,
): Promise<{ ok: boolean; sentTo: string[] }> {
  const tpl = await loadEmailTemplate(slug, 1)

  let subject: string
  let html:    string
  let recipients: { to: string[]; cc: string[]; bcc: string[] }

  if (tpl) {
    if (tpl.audience !== 'admin') {
      console.warn(`[sendAdminTemplate:${slug}] audience attendu 'admin', reçu '${tpl.audience}' — fallback recipient envoyé quand même`)
    }
    subject = tpl.subject ? renderEmailTemplate(tpl.subject, vars) : fallbackSubject
    html    = tpl.htmlBody ? renderEmailTemplate(tpl.htmlBody, vars) : fallbackHtml
    recipients = resolveAdminRecipients(tpl)
  } else {
    subject = fallbackSubject
    html    = fallbackHtml
    
    recipients = resolveAdminRecipients({
      audience: 'admin', subject: '', htmlBody: '', plainBody: null,
      recipientTo: '', recipientCc: '', recipientBcc: '',
    } as LoadedEmailTemplate)
  }

  if (recipients.to.length === 0) {
    console.error(`[sendAdminTemplate:${slug}] aucun destinataire (template recipient_to vide + env ADMIN_NOTIF_EMAIL/BLOG_CONTACT_EMAIL/CONTACT_EMAIL non définies)`)
    return { ok: false, sentTo: [] }
  }
  if (recipients.cc.length || recipients.bcc.length) {
    console.warn(`[sendAdminTemplate:${slug}] Cc/Bcc renseignés mais non encore supportés par la queue (${recipients.cc.length}+${recipients.bcc.length} ignorés). À implémenter via colonnes cc/bcc sur cs_email_queue.`)
  }

  const sentTo: string[] = []
  for (const to of recipients.to) {
    try {
      await sendEmailViaQueue({ to, subject, html, templateSlug: slug, sourceHost })
      sentTo.push(to)
    } catch (err: any) {
      console.error(`[sendAdminTemplate:${slug}] enqueue KO pour ${to}:`, err?.message || err)
    }
  }
  return { ok: sentTo.length > 0, sentTo }
}

function buildSimpleFallback(opts: {
  shopName:    string
  title:       string
  intro:       string
  ctaLabel?:   string
  ctaUrl?:     string
  accentColor: string
  footer?:     string
}): string {
  const { shopName, title, intro, ctaLabel, ctaUrl, accentColor, footer } = opts
  const ctaBlock = ctaLabel && ctaUrl
    ? `<div style="margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${ctaLabel}</a></div>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:${accentColor};padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">${title}</h1>
    </div>
    <div style="padding:32px;font-size:14px;color:#475569;line-height:1.6;">
      ${intro}
      ${ctaBlock}
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
      ${shopName}${footer ? ' — ' + footer : ''}
    </div>
  </div>
</body></html>`
}

export async function sendPaymentPendingEmail(
  customerEmail: string,
  firstname:     string,
  orderRef:      string,
  bankDetails:   { owner?: string; details?: string; address?: string },
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
  

  totalPaid?:   number,
  

  historyUrl?:  string,
) {
  const ribLines = [
    bankDetails.owner   ? `Bénéficiaire : <strong>${bankDetails.owner}</strong>` : '',
    bankDetails.details ? `Coordonnées : <span style="white-space:pre-line;">${bankDetails.details}</span>` : '',
    bankDetails.address ? `Adresse : <span style="white-space:pre-line;">${bankDetails.address}</span>` : '',
  ].filter(Boolean).join('<br>')

  const tpl = await loadEmailTemplate('order_payment_pending', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { order_name: `#${orderRef}`, shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      order_name:           `#${orderRef}`,
      
      
      
      bankwire_owner:        bankDetails.owner   || '',
      bankwire_details:      bankDetails.details || '',
      bankwire_address:      bankDetails.address || '',
      bankwire_details_html: ribLines,
      
      
      
      total_paid:           totalPaid !== undefined ? formatPrice(totalPaid) : '',
      history_url:          historyUrl || '',
      shop_name:            shopName,
      primary_color:        accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  const html = buildSimpleFallback({
    shopName,
    title: `Coordonnées bancaires — Commande #${orderRef}`,
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Pour finaliser votre commande <strong>#${orderRef}</strong>, merci d'effectuer le virement avec les coordonnées suivantes (référence <strong>#${orderRef}</strong> en libellé) :</p>
<div style="background:#eff6ff;border-radius:8px;padding:16px;color:#1e3a8a;font-size:13px;line-height:1.7;">${ribLines || 'RIB à demander au commerçant.'}</div>`,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Coordonnées bancaires — Commande #${orderRef}`,
    html,
  })
}

export async function sendOrderInPreparationEmail(
  customerEmail: string,
  firstname:     string,
  orderRef:      string,
  shopName     = 'Boutique',
  shopUrl      = '',
  accentColor  = '#4F46E5',
) {
  const tpl = await loadEmailTemplate('order_in_preparation', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, {
      order_name: `#${orderRef}`,
      shop_name: shopName,
    })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      order_name:    `#${orderRef}`,
      shop_name:     shopName,
      shop_url:      shopUrl,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  
  const html = buildSimpleFallback({
    shopName,
    title: `Votre commande #${orderRef} est en cours de préparation`,
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Nous vous informons que votre commande <strong>#${orderRef}</strong> est actuellement en cours de préparation par nos équipes 📦</p>
<p>Vous recevrez prochainement un nouvel email avec les informations de suivi dès qu'elle sera expédiée.</p>`,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Votre commande #${orderRef} est en cours de préparation — ${shopName}`,
    html,
  })
}

export async function sendOrderShippedEmail(
  customerEmail: string,
  firstname:     string,
  orderRef:      string,
  carrier:       string,
  trackingUrl:   string,
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
  historyUrl   = '',
) {
  
  
  
  
  
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const tpl = await loadEmailTemplate('order_shipped', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { order_name: `#${orderRef}`, shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      order_name:    `#${orderRef}`,
      carrier,
      tracking_url:  trackingUrl,
      history_url:   historyUrl || trackingUrl || '#',
      date:          dateLabel,
      shop_name:     shopName,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  const html = buildSimpleFallback({
    shopName,
    title: `Votre commande #${orderRef} est en route`,
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Bonne nouvelle : votre commande <strong>#${orderRef}</strong> a été expédiée${carrier ? ` via <strong>${carrier}</strong>` : ''}.</p>
${trackingUrl ? '<p>Vous pouvez suivre son acheminement en cliquant sur le bouton ci-dessous.</p>' : ''}`,
    ctaLabel: trackingUrl ? 'Suivre ma commande' : undefined,
    ctaUrl:   trackingUrl || undefined,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Votre commande #${orderRef} est en route — ${shopName}`,
    html,
  })
}

export async function sendPasswordResetEmail(
  customerEmail: string,
  firstname:     string,
  resetUrl:      string,
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
) {
  const tpl = await loadEmailTemplate('password_reset', 1)
  if (tpl?.htmlBody) {
    
    
    
    const dateLabel = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const subject = renderEmailTemplate(tpl.subject, { shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      
      
      
      reset_url:     resetUrl,
      url:           resetUrl,
      date:          dateLabel,
      shop_name:     shopName,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  const html = buildSimpleFallback({
    shopName,
    title: 'Réinitialisation de votre mot de passe',
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
<p style="font-size:12px;color:#94a3b8;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.</p>`,
    ctaLabel: 'Réinitialiser mon mot de passe',
    ctaUrl:   resetUrl,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Réinitialisation de votre mot de passe — ${shopName}`,
    html,
  })
}

export async function sendPasswordChangedEmail(
  customerEmail: string,
  firstname:     string,
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
) {
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const tpl = await loadEmailTemplate('password_changed', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      date:          dateLabel,
      shop_name:     shopName,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html, templateSlug: 'password_changed' })
  }

  
  const html = buildSimpleFallback({
    shopName,
    title: 'Mot de passe modifié',
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Le mot de passe de votre compte vient d'être modifié avec succès le ${dateLabel}.</p>
<p style="font-size:12px;color:#94a3b8;">Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement — nous bloquerons votre compte le temps de l'enquête.</p>`,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Votre mot de passe a été modifié — ${shopName}`,
    html,
    templateSlug: 'password_changed',
  })
}

export async function sendCartRecoveryEmail(opts: {
  to:            string
  firstname:     string
  salutation:    string
  itemsCount:    number
  totalHt:       string
  cartUrl:       string
  shopName?:     string
  accentColor?:  string
  subjectPrefix?: string
}) {
  const shopName    = opts.shopName    ?? 'Boutique'
  const accentColor = opts.accentColor ?? '#4F46E5'
  const itemsLabel  = opts.itemsCount > 1 ? 'articles' : 'article'

  const vars = {
    firstname:     opts.firstname,
    salutation:    opts.salutation,
    items_count:   opts.itemsCount,
    items_label:   itemsLabel,
    total_ht:      opts.totalHt,
    cart_url:      opts.cartUrl,
    shop_name:     shopName,
    primary_color: accentColor,
  }

  const tpl = await loadEmailTemplate('cart_recovery', 1)
  let subject: string
  let html:    string
  if (tpl?.htmlBody) {
    subject = renderEmailTemplate(tpl.subject || 'Votre panier vous attend — {items_count} {items_label} en attente', vars)
    html    = renderEmailTemplate(tpl.htmlBody, vars)
  } else {
    
    subject = `Votre panier vous attend — ${opts.itemsCount} ${itemsLabel} en attente`
    html    = buildSimpleFallback({
      shopName,
      title: 'Votre panier vous attend',
      intro: `<p>${opts.salutation},</p>
<p>Vous avez constitué un panier sur <strong>${shopName}</strong> il y a quelques jours, mais vous n'avez pas finalisé votre commande.</p>
<p style="background:#f5f5f0;padding:15px;border-left:4px solid ${accentColor};">
  <strong>${opts.itemsCount} ${itemsLabel}</strong> en attente — montant estimé&nbsp;: <strong>${opts.totalHt}</strong>
</p>`,
      ctaLabel: 'Reprendre mon panier',
      ctaUrl:   opts.cartUrl,
      accentColor,
    })
  }

  if (opts.subjectPrefix) subject = `${opts.subjectPrefix} ${subject}`

  return sendEmailViaQueue({
    to:           opts.to,
    subject,
    html,
    templateSlug: 'cart_recovery',
  })
}

export async function sendQuoteFollowupEmail(opts: {
  to:            string
  firstname:     string
  salutation:    string
  company:       string
  quoteRef:      string
  ageDays:       number
  itemsCount:    number
  totalHt:       string
  rdvUrl:        string
  shopName?:     string
  accentColor?:  string
  subjectPrefix?: string
}) {
  const shopName    = opts.shopName    ?? 'Boutique'
  const accentColor = opts.accentColor ?? '#4F46E5'

  const vars = {
    firstname:           opts.firstname,
    salutation:          opts.salutation,
    company:             opts.company || shopName,
    quote_ref:           opts.quoteRef,
    age_days:            opts.ageDays,
    age_days_plural:     opts.ageDays > 1 ? 's' : '',
    items_count:         opts.itemsCount,
    items_count_plural:  opts.itemsCount > 1 ? 's' : '',
    total_ht:            opts.totalHt,
    rdv_url:             opts.rdvUrl,
    shop_name:           shopName,
    primary_color:       accentColor,
  }

  const tpl = await loadEmailTemplate('quote_followup', 1)
  let subject: string
  let html:    string
  if (tpl?.htmlBody) {
    subject = renderEmailTemplate(tpl.subject || 'Suite à votre demande de devis {quote_ref}', vars)
    html    = renderEmailTemplate(tpl.htmlBody, vars)
  } else {
    subject = `Suite à votre demande de devis ${opts.quoteRef} — souhaitez-vous avancer ?`
    html    = buildSimpleFallback({
      shopName,
      title: 'Suite à votre demande de devis',
      intro: `<p>${opts.salutation},</p>
<p>Vous avez fait une demande de devis pour <strong>${opts.company || shopName}</strong> il y a ${opts.ageDays} jour${opts.ageDays > 1 ? 's' : ''} et nous n'avons pas encore eu votre retour.</p>
<p style="background:#f5f5f0;padding:15px;border-left:4px solid ${accentColor};">
  <strong>${opts.itemsCount} produit${opts.itemsCount > 1 ? 's' : ''}</strong> — total catalogue&nbsp;: <strong>${opts.totalHt}</strong>
</p>
<p>Souhaitez-vous que nous avancions sur la proposition&nbsp;?</p>`,
      ctaLabel: 'Prendre rendez-vous',
      ctaUrl:   opts.rdvUrl,
      accentColor,
    })
  }

  if (opts.subjectPrefix) subject = `${opts.subjectPrefix} ${subject}`

  return sendEmailViaQueue({
    to:           opts.to,
    subject,
    html,
    templateSlug: 'quote_followup',
  })
}

export async function sendQuoteRequestEmail(opts: {
  customerEmail: string
  firstname:     string
  company:       string
  quoteRef:      string
  totalItems:    number
  shopName?:     string
  accentColor?:  string
  
  itemsHtml?:    string
  
  total?:        string
  
  validUntil?:   string
  
  quotePdfUrl?:  string
  
  rdvUrl?:       string
  

  quoteIdForPdf?: number
  

  validateQuoteUrl?: string
}) {
  const shopName    = opts.shopName    ?? 'Boutique'
  const accentColor = opts.accentColor ?? '#4F46E5'
  const itemsHtml   = opts.itemsHtml   ?? ''
  const total       = opts.total       ?? 'Sur devis — proposition tarifaire à venir'
  const validUntil  = opts.validUntil  ?? ''
  const quotePdfUrl = opts.quotePdfUrl ?? ''
  const rdvUrl      = opts.rdvUrl      ?? ''
  const validateQuoteUrl = opts.validateQuoteUrl ?? ''

  
  
  
  
  
  
  
  
  const validateQuoteHtml = validateQuoteUrl
    ? `<div style="margin:28px 0;text-align:center;">
  <a href="${validateQuoteUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:18px 40px;border-radius:10px;font-weight:700;font-size:17px;letter-spacing:0.02em;box-shadow:0 6px 12px -2px rgba(220,38,38,0.35);mso-padding-alt:0;">
    <span style="display:inline-block;vertical-align:middle;margin-right:10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </span><span style="vertical-align:middle;">Valider le devis</span>
  </a>
  <p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">Accès direct à votre panier — finalisez en quelques clics</p>
</div>`
    : ''

  const tpl = await loadEmailTemplate('quote_request', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { quote_ref: opts.quoteRef, shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname:          opts.firstname,
      company:            opts.company,
      quote_ref:          opts.quoteRef,
      quote_items_html:   itemsHtml,
      quote_total:        total,
      valid_until:        validUntil,
      total_items:        opts.totalItems,
      shop_name:          shopName,
      primary_color:      accentColor,
      quote_pdf_url:      quotePdfUrl,
      rdv_url:            rdvUrl,
      validate_quote_url: validateQuoteUrl,
      validate_quote_html: validateQuoteHtml,
    })
    
    
    
    return sendEmailViaQueue({
      to:           opts.customerEmail,
      subject,
      html,
      templateSlug: 'quote_request',
      ...(opts.quoteIdForPdf
        ? { attachmentMeta: { type: 'quote_pdf', quoteId: opts.quoteIdForPdf } }
        : {}),
    })
  }

  const summaryBlock = quoteAckSummaryHtml({ itemsHtml, totalItems: opts.totalItems, total, validUntil })
  const html = buildSimpleFallback({
    shopName,
    title: `Votre demande de devis ${opts.quoteRef}`,
    intro: `<p>Bonjour <strong>${opts.firstname}</strong>,</p>
<p>Nous avons bien reçu votre demande de devis pour <strong>${opts.company}</strong> (référence <strong>${opts.quoteRef}</strong>).</p>
${summaryBlock}
<p>Notre équipe revient vers vous sous 24-48h ouvrées avec une proposition tarifaire détaillée.</p>`,
    accentColor,
    footer: 'Cet email confirme la réception de votre demande.',
  })
  return sendEmailViaQueue({
    to: opts.customerEmail,
    subject: `Votre demande de devis ${opts.quoteRef} — ${shopName}`,
    html,
  })
}

export async function sendAdminContactFormEmail(opts: {
  firstname?:    string
  lastname?:     string
  email:         string
  phone?:        string
  message?:      string
  articleTitle?: string
  articleUrl?:   string
  leadId?:       number | null
  projectId?:    number | null
  sourceHost?:   string | null
}) {
  const date = new Date().toLocaleString('fr-FR')
  const fbHtml = buildSimpleFallback({
    shopName: 'Admin',
    title: '📝 Nouveau contact',
    intro: `<p><strong>De :</strong> ${opts.firstname || ''} ${opts.lastname || ''} &lt;${opts.email}&gt;</p>
${opts.phone ? `<p><strong>Téléphone :</strong> ${opts.phone}</p>` : ''}
${opts.articleTitle ? `<p><strong>Article :</strong> <a href="${opts.articleUrl || '#'}">${opts.articleTitle}</a></p>` : ''}
${opts.message ? `<p><strong>Message :</strong></p><blockquote style="border-left:3px solid #e2e8f0;margin:8px 0;padding-left:12px;color:#475569;white-space:pre-line;">${opts.message}</blockquote>` : ''}
<p style="font-size:12px;color:#94a3b8;">Lead #${opts.leadId ?? 'N/A'} · Projet #${opts.projectId ?? 'N/A'} · ${date}</p>`,
    accentColor: '#7C3AED',
  })

  return sendAdminTemplate(
    'admin_contact_form',
    `[Contact] ${opts.firstname || ''} ${opts.lastname || ''} — ${opts.email}`.slice(0, 200),
    fbHtml,
    {
      firstname:     opts.firstname    ?? '',
      lastname:      opts.lastname     ?? '',
      email:         opts.email,
      phone:         opts.phone        ?? '',
      message:       opts.message      ?? '',
      article_title: opts.articleTitle ?? '',
      article_url:   opts.articleUrl   ?? '',
      lead_id:       opts.leadId       ?? '',
      project_id:    opts.projectId    ?? '',
      date,
    },
    opts.sourceHost,
  )
}

function buildAddressBlockHtml(addr: { firstname?: string; lastname?: string; company?: string; address1?: string; address2?: string; postcode?: string; city?: string; phone?: string; phoneMobile?: string; vatNumber?: string } | undefined): string {
  if (!addr) return ''
  const lines: string[] = []
  
  
  
  const firstname = unescapeDbText(addr.firstname)
  const lastname  = unescapeDbText(addr.lastname)
  const fullName = `${firstname} ${lastname}`.trim()
  const company  = unescapeDbText(addr.company)
  const address1 = unescapeDbText(addr.address1)
  const address2 = unescapeDbText(addr.address2)
  const city     = unescapeDbText(addr.city)
  const phone    = unescapeDbText(addr.phone)
  const phoneMobile = unescapeDbText(addr.phoneMobile)
  if (company)  lines.push(`<strong>${escAttr(company)}</strong>`)
  if (fullName) lines.push(escAttr(fullName))
  if (address1) lines.push(escAttr(address1))
  if (address2) lines.push(escAttr(address2))
  const cityLine = `${addr.postcode || ''} ${city}`.trim()
  if (cityLine)    lines.push(escAttr(cityLine))
  
  if (phone)       lines.push(`☎ ${escAttr(phone)}`)
  if (phoneMobile) lines.push(`📱 ${escAttr(phoneMobile)}`)
  if (addr.vatNumber) lines.push(`TVA&nbsp;: ${escAttr(addr.vatNumber)}`)
  if (!lines.length) return ''
  return `<div style="font-size:13px;color:#1f2937;line-height:1.5;">${lines.join('<br>')}</div>`
}

export interface AdminNewOrderOpts {
  orderRef:        string
  customerName:    string
  customerEmail:   string
  totalPaid:       number
  payment:         string
  shopName?:       string
  firstname?:      string
  lastname?:       string
  company?:        string
  
  siret?:          string
  idOrder?:        number
  order?:          OrderData
  carrierName?:    string
  customerMessage?: string
}

export async function buildAdminNewOrderVars(opts: AdminNewOrderOpts): Promise<Record<string, string>> {
  const date = new Date().toLocaleString('fr-FR')
  const totalPaidStr = formatPrice(opts.totalPaid)
  
  const customerNameClean = unescapeDbText(opts.customerName)
  const companyClean = unescapeDbText(opts.company)
  const firstname = unescapeDbText(opts.firstname) || (customerNameClean.split(' ')[0] || '')
  const lastname  = unescapeDbText(opts.lastname)  || (customerNameClean.split(' ').slice(1).join(' ') || '')

  const addrDelivery = opts.order?.addressDelivery
  const addrInvoice  = opts.order?.addressInvoice
  const sameAddress  = !!(addrDelivery?.id && addrInvoice?.id && addrDelivery.id === addrInvoice.id)
  const deliveryAddressHtml = buildAddressBlockHtml(addrDelivery)
  const invoiceAddressHtml  = sameAddress
    ? '<div style="font-size:13px;color:#64748b;font-style:italic;">Identique à l\'adresse de livraison</div>'
    : buildAddressBlockHtml(addrInvoice)

  const customerPhone = unescapeDbText(addrDelivery?.phone || addrDelivery?.phoneMobile)
  const customerPhoneLineHtml = customerPhone
    ? `<p style="margin:0 0 8px;font-size:13px;color:#475569;">☎ ${escAttr(customerPhone)}</p>`
    : ''

  let productsHtml = ''
  if (opts.order && opts.order.items?.length) {
    const adminDetails = opts.idOrder ? await fetchOrderAdminItemsDetails(opts.idOrder) : []
    productsHtml = buildAdminOrderProductsHtml(opts.order, adminDetails)
  }

  const companyLineHtml = companyClean
    ? `<p style="margin:0 0 8px;font-size:13px;color:#475569;">${escAttr(companyClean)}</p>`
    : ''

  
  
  
  const companyId = readCompanyId(opts.siret)
  const sirenLineHtml = companyId.siren
    ? `<p style="margin:0 0 8px;font-size:13px;color:#475569;">SIREN&nbsp;: <span style="font-family:monospace;color:#0f172a;">${escAttr(companyId.siren)}</span></p>`
    : ''

  const carrierName = (opts.carrierName || '').trim()
  const carrierBlockHtml = carrierName
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin:0 0 24px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;">🚚 Transporteur</p>
<p style="margin:0;font-size:15px;color:#0f172a;font-weight:600;">${escAttr(carrierName)}</p>
</td></tr>
</table>
`
    : ''

  const customerMessage = (opts.customerMessage || '').trim()
  const customerMessageBlockHtml = customerMessage
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:10px;border:1px solid #fde68a;margin:0 0 24px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.04em;">💬 Commentaire du client</p>
<p style="margin:0;font-size:14px;color:#0f172a;line-height:1.5;white-space:pre-line;">${escAttr(customerMessage)}</p>
</td></tr>
</table>
`
    : ''

  
  
  
  const addrCountryIso = (opts.order?.addressInvoice as any)?.countryIso
                       || (opts.order?.addressDelivery as any)?.countryIso || 'FR'
  const addrVatNumber  = unescapeDbText((opts.order?.addressInvoice as any)?.vatNumber
                       || (opts.order?.addressDelivery as any)?.vatNumber || '')
  const vatCtx = resolveVatContext({
    countryIso: addrCountryIso,
    vatNumber:  addrVatNumber,
  })
  const vatLegalMentionHtml = vatCtx.legalMention
    ? `<p style="margin:12px 0 0;padding:10px 14px;background:#f0f9ff;border-left:3px solid #0ea5e9;font-size:11px;color:#075985;line-height:1.45;">
<strong>Mention légale :</strong> ${escAttr(vatCtx.legalMention)}${addrVatNumber ? `<br><span style="font-family:monospace;color:#1e293b;">N° TVA : ${escAttr(addrVatNumber)}</span>` : ''}
</p>`
    : ''

  return {
    order_name:        `#${opts.orderRef}`,
    order_ref:         opts.orderRef,
    customer_name:     customerNameClean,
    customer_email:    opts.customerEmail,
    firstname,
    lastname,
    company:           companyClean,
    company_line_html: companyLineHtml,
    siren:             companyId.siren,
    siret:             companyId.siret,
    siren_line_html:   sirenLineHtml,
    total_paid:        totalPaidStr,
    payment:           opts.payment,
    shop_name:         opts.shopName || 'Boutique',
    date,
    id_order:          opts.idOrder ? String(opts.idOrder) : '',
    products:          productsHtml,
    delivery_address_html: deliveryAddressHtml,
    invoice_address_html:  invoiceAddressHtml,
    same_address:          sameAddress ? '1' : '',
    customer_phone:           customerPhone,
    customer_phone_line_html: customerPhoneLineHtml,
    carrier_name:             carrierName,
    carrier_block_html:       carrierBlockHtml,
    customer_message:           customerMessage,
    customer_message_block_html: customerMessageBlockHtml,
    
    vat_legal_mention_html:      vatLegalMentionHtml,
    vat_context_kind:            vatCtx.kind,
  }
}

export async function sendAdminNewOrderEmail(opts: AdminNewOrderOpts) {
  const vars = await buildAdminNewOrderVars(opts)
  const fbHtml = buildSimpleFallback({
    shopName: opts.shopName || 'Boutique',
    title: `🛒 Nouvelle commande #${opts.orderRef}`,
    intro: `<p><strong>Client :</strong> ${opts.customerName} &lt;${opts.customerEmail}&gt;</p>
${opts.company ? `<p><strong>Société :</strong> ${opts.company}</p>` : ''}
<p><strong>Montant :</strong> ${vars.total_paid}</p>
<p><strong>Paiement :</strong> ${opts.payment}</p>
<p style="font-size:12px;color:#94a3b8;">${vars.date}</p>`,
    accentColor: '#0ea5e9',
  })

  return sendAdminTemplate(
    'admin_new_order',
    `[Admin] Nouvelle commande #${opts.orderRef} — ${opts.customerName}`.slice(0, 200),
    fbHtml,
    vars,
  )
}

export async function notifyAdminNewOrder(opts: {
  order: OrderData
  customerEmail: string
  shopName: string
  carrierName?: string
  customerMessage?: string
  customerId?: number
}) {
  const d = usePocPg()
  const order: any = opts.order
  const idOrder = Number(order.id || 0)
  const addr = order.addressDelivery
  const customerName = `${addr?.firstname || ''} ${addr?.lastname || ''}`.trim() || opts.customerEmail

  
  let custId = Number(opts.customerId || 0)
  if (!custId && idOrder) {
    const cr: any[] = await d.execute(sql`
      SELECT id_customer FROM cs_main.ps_orders WHERE id_order = ${idOrder} LIMIT 1
    `).catch(() => [] as any[]) as any[]
    custId = Number(cr?.[0]?.id_customer || 0)
  }

  
  let company = String(addr?.company || '')
  let siret = ''
  if (custId) {
    const rows: any[] = await d.execute(sql`
      SELECT company, siret FROM cs_main.ps_customer WHERE id_customer = ${custId} LIMIT 1
    `).catch(() => [] as any[]) as any[]
    company = String(rows?.[0]?.company || company)
    siret = String(rows?.[0]?.siret || '')
  }

  
  let customerMessage = String(opts.customerMessage || '')
  if (!customerMessage && idOrder) {
    const msgRows: any[] = await d.execute(sql`
      SELECT message FROM cs_main.ps_message
       WHERE id_order = ${idOrder} AND private = 0
       ORDER BY id_message ASC LIMIT 1
    `).catch(() => [] as any[]) as any[]
    customerMessage = String(msgRows?.[0]?.message || '')
  }

  return sendAdminNewOrderEmail({
    orderRef:        String(order.reference),
    customerName,
    customerEmail:   opts.customerEmail,
    totalPaid:       Number(order.totalPaidTTC || 0),
    payment:         String(order.payment || ''),
    shopName:        opts.shopName,
    firstname:       String(addr?.firstname || ''),
    lastname:        String(addr?.lastname || ''),
    company,
    siret,
    idOrder,
    order,
    carrierName:     opts.carrierName,
    customerMessage,
  })
}

export async function sendAdminNewLeadEmail(opts: {
  firstname:    string
  lastname:     string
  email:        string
  phone?:       string
  company:      string
  totalItems:   number
  quoteRef:     string
  message?:     string
}) {
  const date = new Date().toLocaleString('fr-FR')
  const customerName = `${opts.firstname} ${opts.lastname}`.trim()
  const itemsLabel = quoteItemsLabel(opts.totalItems)
  const fbHtml = buildSimpleFallback({
    shopName: 'Admin',
    title: `🎯 Nouveau lead — ${customerName}`,
    intro: `<p><strong>Société :</strong> ${opts.company}</p>
<p><strong>Contact :</strong> ${customerName} &lt;${opts.email}&gt;${opts.phone ? ` · ${opts.phone}` : ''}</p>
<p><strong>Devis :</strong> ${opts.quoteRef}${itemsLabel ? ` (${itemsLabel})` : ''}</p>
${opts.message ? `<p><strong>Message :</strong></p><blockquote style="border-left:3px solid #e2e8f0;margin:8px 0;padding-left:12px;color:#475569;white-space:pre-line;">${opts.message}</blockquote>` : ''}
<p style="font-size:12px;color:#94a3b8;">${date}</p>`,
    accentColor: '#10b981',
  })

  return sendAdminTemplate(
    'admin_new_lead',
    `[Admin] Nouveau lead — ${customerName} (${opts.company})`.slice(0, 200),
    fbHtml,
    {
      firstname:     opts.firstname,
      lastname:      opts.lastname,
      customer_name: customerName,
      email:         opts.email,
      phone:         opts.phone   ?? '',
      company:       opts.company,
      total_items:   opts.totalItems,
      quote_ref:     opts.quoteRef,
      message:       opts.message ?? '',
      date,
    },
  )
}
