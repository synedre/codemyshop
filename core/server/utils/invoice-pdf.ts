

import PDFDocument from 'pdfkit'
import type { OrderData } from '~/server/connectors/base'

export interface InvoiceSeller {
  
  addressLines: string[]
  siret?: string
  vatNumber?: string
  
  details?: string
  
  legalText?: string
}

export function buildInvoiceSeller(cfg: Partial<Record<string, string | null>>): InvoiceSeller {
  const v = (k: string) => String(cfg[k] ?? '').trim()
  const cityLine = [v('PS_SHOP_CODE'), v('PS_SHOP_CITY')].filter(Boolean).join(' ')
  return {
    addressLines: [v('PS_SHOP_ADDR1'), v('PS_SHOP_ADDR2'), cityLine].filter(Boolean),
    siret: v('PS_SHOP_SIRET') || undefined,
    vatNumber: v('PS_SHOP_VAT_NUMBER') || undefined,
    details: v('PS_SHOP_DETAILS') || undefined,
    legalText: v('PS_INVOICE_LEGAL_FREE_TEXT') || undefined,
  }
}

export const DEFAULT_INVOICE_LABELS = {
  invoice: 'Facture',
  invoice_number: 'Facture n° {number}',
  order_summary: 'Récapitulatif de commande',
  order_ref: 'Commande #{reference}',
  date: 'Date : {date}',
  siret: 'SIRET : {value}',
  vat_number: 'N° TVA : {value}',
  billing_address: 'Adresse de facturation',
  delivery_address: 'Adresse de livraison',
  col_product: 'Produit',
  col_ref: 'Réf.',
  col_qty: 'Qté',
  col_unit_ht: 'P.U. HT',
  col_vat: 'TVA',
  col_total_ht: 'Total HT',
  products_ht: 'Total produits HT',
  discount_ht: 'Remise HT',
  shipping_ht: 'Livraison HT',
  total_ht: 'Total HT',
  vat_line: 'TVA {rate} % sur {base}',
  total_ttc: 'Total TTC',
  payment: 'Paiement : {method}',
  generated: 'Document généré le {date} — {shop}',
}
export type InvoiceLabels = typeof DEFAULT_INVOICE_LABELS

const fill = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))

const round2 = (n: number) => Math.round(n * 100) / 100

export function pdfPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n).replace(/[\u202F\u00A0]/g, ' ')
}

export function lineVatRate(priceHT: number, priceTTC: number): number {
  if (!(priceHT > 0)) return 0
  return Math.round((priceTTC / priceHT - 1) * 1000) / 10
}

export interface VatLine { rate: number; base: number; tax: number }

export function invoiceVatLines(order: OrderData): VatLine[] {
  if (order.vatLines?.length) return order.vatLines.map(v => ({ ...v }))
  const groups = new Map<number, VatLine>()
  const add = (rate: number, base: number, tax: number) => {
    const g = groups.get(rate) ?? { rate, base: 0, tax: 0 }
    g.base += base; g.tax += tax
    groups.set(rate, g)
  }
  for (const it of order.items) {
    add(lineVatRate(it.priceHT, it.priceTTC), it.priceHT * it.quantity, (it.priceTTC - it.priceHT) * it.quantity)
  }
  const shipHT = Number(order.totalShippingHT ?? 0)
  const shipTTC = Number(order.totalShipping ?? 0)
  if (shipTTC > 0) add(lineVatRate(shipHT, shipTTC), shipHT, shipTTC - shipHT)

  if (groups.size <= 1) {
    const rate = groups.size ? [...groups.keys()][0] : 0
    return [{ rate, base: round2(order.totalPaidHT), tax: round2(order.totalPaidTTC - order.totalPaidHT) }]
  }
  const list = [...groups.values()].sort((a, b) => b.base - a.base)
  const discHT = Number(order.totalDiscountsHT ?? 0)
  const discTTC = Number(order.totalDiscountsTTC ?? 0)
  if (discHT > 0) { list[0].base -= discHT; list[0].tax -= discTTC - discHT }
  return list.map(g => ({ rate: g.rate, base: round2(g.base), tax: round2(g.tax) }))
    .sort((a, b) => a.rate - b.rate)
}

export function invoiceTitle(order: Pick<OrderData, 'invoiceNumber'>, labels: InvoiceLabels = DEFAULT_INVOICE_LABELS): string {
  return order.invoiceNumber ? fill(labels.invoice_number, { number: order.invoiceNumber }) : labels.order_summary
}

export function generateInvoicePdf(
  order: OrderData,
  shopName: string,
  accentColor = '#4F46E5',
  seller: InvoiceSeller = { addressLines: [] },
  labels: InvoiceLabels = DEFAULT_INVOICE_LABELS,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const dark = '#1e293b'
    const gray = '#64748b'
    const accent = accentColor

    const formatPrice = pdfPrice
    const formatDate = (d: string) =>
      d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
    const formatRate = (r: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(r)

    
    doc.fontSize(20).fillColor(dark).text(shopName, 50, 50)
    let sy = 76
    doc.fontSize(8).fillColor(gray)
    const sellerLines = [
      ...seller.addressLines,
      ...(seller.details ? seller.details.split('\n') : []),
      ...(seller.siret ? [fill(labels.siret, { value: seller.siret })] : []),
      ...(seller.vatNumber ? [fill(labels.vat_number, { value: seller.vatNumber })] : []),
    ].map(l => l.trim()).filter(Boolean)
    for (const line of sellerLines) { doc.text(line, 50, sy, { width: 280 }); sy += 11 }

    
    const rightX = 350
    doc.fontSize(12).fillColor(dark)
    doc.text(invoiceTitle(order, labels), rightX - 50, 50, { width: 250, align: 'right' })
    doc.fontSize(9).fillColor(gray)
    doc.text(fill(labels.order_ref, { reference: order.reference }), rightX, 70, { width: 200, align: 'right' })
    doc.text(fill(labels.date, { date: formatDate(order.invoiceDate || order.dateAdd) }), rightX, 84, { width: 200, align: 'right' })

    
    const sepY = Math.max(110, sy + 8)
    doc.moveTo(50, sepY).lineTo(545, sepY).strokeColor('#e2e8f0').lineWidth(1).stroke()

    
    const top = sepY + 15
    let y = top

    if (order.addressInvoice || order.addressDelivery) {
      const addr = order.addressInvoice || order.addressDelivery!
      doc.fontSize(9).fillColor(gray).text(labels.billing_address, 50, y)
      y += 14
      doc.fontSize(10).fillColor(dark)
      if (addr.company) { doc.text(addr.company, 50, y); y += 13 }
      doc.text(`${addr.firstname} ${addr.lastname}`, 50, y); y += 13
      doc.text(addr.address1, 50, y); y += 13
      if (addr.address2) { doc.text(addr.address2, 50, y); y += 13 }
      doc.text(`${addr.postcode} ${addr.city}`, 50, y); y += 13
      if (addr.phone) { doc.text(addr.phone, 50, y); y += 13 }
      if (addr.vatNumber) { doc.text(fill(labels.vat_number, { value: addr.vatNumber }), 50, y); y += 13 }
    }

    if (order.addressDelivery && order.addressInvoice) {
      let dy = top
      const addr = order.addressDelivery
      doc.fontSize(9).fillColor(gray).text(labels.delivery_address, 300, dy)
      dy += 14
      doc.fontSize(10).fillColor(dark)
      if (addr.company) { doc.text(addr.company, 300, dy); dy += 13 }
      doc.text(`${addr.firstname} ${addr.lastname}`, 300, dy); dy += 13
      doc.text(addr.address1, 300, dy); dy += 13
      if (addr.address2) { doc.text(addr.address2, 300, dy); dy += 13 }
      doc.text(`${addr.postcode} ${addr.city}`, 300, dy); dy += 13
    }

    y = Math.max(y, top + 75) + 20

    
    doc.rect(50, y, 495, 22).fill('#f8fafc')
    doc.fontSize(8).fillColor(gray)
    doc.text(labels.col_product, 55, y + 6, { width: 200 })
    doc.text(labels.col_ref, 260, y + 6, { width: 60 })
    doc.text(labels.col_qty, 320, y + 6, { width: 35, align: 'center' })
    doc.text(labels.col_unit_ht, 355, y + 6, { width: 65, align: 'right' })
    doc.text(labels.col_vat, 420, y + 6, { width: 45, align: 'right' })
    doc.text(labels.col_total_ht, 470, y + 6, { width: 70, align: 'right' })
    y += 26

    
    doc.fontSize(9).fillColor(dark)
    for (const item of order.items) {
      if (y > 700) {
        doc.addPage()
        y = 50
      }
      const nameHeight = doc.heightOfString(item.name, { width: 200 })
      doc.text(item.name, 55, y, { width: 200 })
      doc.fillColor(gray).text(item.reference, 260, y, { width: 60 })
      doc.fillColor(dark).text(String(item.quantity), 320, y, { width: 35, align: 'center' })
      
      
      doc.text(formatPrice(item.priceHT), 355, y, { width: 65, align: 'right' })
      doc.text(`${formatRate(lineVatRate(item.priceHT, item.priceTTC))} %`, 420, y, { width: 45, align: 'right' })
      doc.text(formatPrice(item.priceHT * item.quantity), 470, y, { width: 70, align: 'right' })
      y += Math.max(14, nameHeight + 2)
      const hasPromo = item.priceHTBeforeDiscount && item.priceHTBeforeDiscount > 0
      if (hasPromo || item.reductionLabel) {
        doc.fontSize(7)
        if (hasPromo) {
          doc.fillColor('#dc2626').text(formatPrice(item.priceHTBeforeDiscount!), 355, y, {
            width: 65, align: 'right', strike: true,
          })
        }
        if (item.reductionLabel) {
          doc.fillColor('#dc2626').text(item.reductionLabel, 470, y, { width: 70, align: 'right' })
        }
        doc.fontSize(9).fillColor(dark)
        y += 12
      }
      y += 4
    }

    
    y += 8
    doc.moveTo(330, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke()
    y += 12

    
    const row = (label: string, value: number) => {
      doc.fillColor(gray).text(label, 330, y, { width: 135 })
      doc.fillColor(dark).text(formatPrice(value), 470, y, { width: 70, align: 'right' })
      y += 16
    }
    doc.fontSize(9)
    row(labels.products_ht, order.totalProducts)
    if (Number(order.totalDiscountsHT) > 0) row(labels.discount_ht, -Number(order.totalDiscountsHT))
    
    if (order.totalShippingHT !== undefined || Number(order.totalShipping) > 0) {
      row(labels.shipping_ht, Number(order.totalShippingHT ?? 0))
    }
    row(labels.total_ht, order.totalPaidHT)
    for (const v of invoiceVatLines(order)) {
      row(fill(labels.vat_line, { rate: formatRate(v.rate), base: formatPrice(v.base) }), v.tax)
    }
    y += 4
    doc.moveTo(330, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke()
    y += 10
    doc.fontSize(12).fillColor(accent).text(labels.total_ttc, 330, y, { width: 135 })
    doc.text(formatPrice(order.totalPaidTTC), 470, y, { width: 70, align: 'right' })
    y += 20
    doc.fontSize(9).fillColor(gray)
    doc.text(fill(labels.payment, { method: order.payment }), 330, y, { width: 215 })

    
    doc.fontSize(7).fillColor(gray)
    if (seller.legalText) {
      const h = doc.heightOfString(seller.legalText, { width: 495 })
      if (y + 20 > 770 - h) doc.addPage()
      doc.text(seller.legalText, 50, 770 - h, { width: 495, align: 'center' })
    }
    doc.text(
      fill(labels.generated, { date: new Date().toLocaleDateString('fr-FR'), shop: shopName }),
      50, 780, { width: 495, align: 'center' },
    )

    doc.end()
  })
}
