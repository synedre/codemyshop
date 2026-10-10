

import PDFDocument from 'pdfkit'
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { resolveDocumentBrandName, resolveDocumentAccentColor, documentTextOnAccent } from './document-brand'
import { getThemePrimaryColor } from '~/modules/theme/server/utils/theme'

interface QuoteRow {
  id_quote_request: number
  firstname:        string
  lastname:         string
  email:            string
  phone:            string | null
  company:          string
  siret:            string | null
  activite:         string | null
  message:          string | null
  total_items:      number
  date_add:         Date
  
  legal_name:       string | null
  naf_code:         string | null
  naf_label:        string | null
  postal_code:      string | null
  city_insee:       string | null
  address_insee:    string | null
  staff_size:       string | null
}
interface QuoteItemRow {
  id_product: number
  name:       string
  reference:  string | null
  quantity:   number
  price?:     number   
}

const fmtPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export async function generateQuoteRequestPdf(idQuoteRequest: number): Promise<Buffer | null> {
  const d = usePocPg()

  const quoteRows = await d.execute(sql`
    SELECT id_quote_request, firstname, lastname, email, phone, company, siret,
           activite, message, total_items, date_add,
           legal_name, naf_code, naf_label, postal_code, city_insee, address_insee, staff_size
      FROM cs_main.cs_quote_request
     WHERE id_quote_request = ${idQuoteRequest}
     LIMIT 1
  `) as unknown as QuoteRow[]
  const quote = quoteRows[0]
  if (!quote) return null

  const itemRows = await d.execute(sql`
    SELECT i.id_product, i.name, i.reference, i.quantity,
           p.price AS price
      FROM cs_main.cs_quote_request_item i
      LEFT JOIN cs_main.ps_product p ON p.id_product = i.id_product
     WHERE i.id_quote_request = ${idQuoteRequest}
     ORDER BY i.id_quote_request_item ASC
  `) as unknown as QuoteItemRow[]
  let totalHt = 0
  for (const it of itemRows) {
    const u = Number(it.price) || 0
    totalHt += u * it.quantity
  }

  const shopRows = await d.execute(sql`
    SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1
  `) as unknown as { value: string }[]
  
  
  
  
  const shopName = resolveDocumentBrandName(
    shopRows[0]?.value,
    useRuntimeConfig().public?.brandName,
  )
  
  
  const pub = useRuntimeConfig().public as any
  const accent = resolveDocumentAccentColor(
    await getThemePrimaryColor({ clientId: pub?.clientId }).catch(() => null),
    pub?.brandColor,
  )
  const onAccent = documentTextOnAccent(accent)

  
  
  
  
  const minOrderRows = await d.execute(sql`
    SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_PURCHASE_MINIMUM' LIMIT 1
  `) as unknown as { value: string }[]
  const purchaseMinimum = Number(minOrderRows[0]?.value || 0)

  const carrierRow = (await d.execute(sql`
    SELECT c.id_carrier, c.name
      FROM cs_main.ps_carrier c
     WHERE c.deleted = 0 AND c.active = 1 AND c.is_free = 0
     ORDER BY c.id_carrier
     LIMIT 1
  `) as unknown as { id_carrier: number; name: string }[])[0]
  let carrierName = ''
  let freeFromHt = 0
  let flatCostBelowHt = 0
  if (carrierRow?.id_carrier) {
    carrierName = String(carrierRow.name || '')
    const ranges = await d.execute(sql`
      SELECT rp.delimiter1, rp.delimiter2, COALESCE(MIN(d.price), 0) AS shipping_cost
        FROM cs_main.ps_range_price rp
        LEFT JOIN cs_main.ps_delivery d ON d.id_range_price = rp.id_range_price
       WHERE rp.id_carrier = ${carrierRow.id_carrier}
       GROUP BY rp.id_range_price, rp.delimiter1, rp.delimiter2
       ORDER BY rp.delimiter1 ASC
    `) as unknown as { delimiter1: number | string; shipping_cost: number | string }[]
    for (const r of ranges) {
      const cost = Number(r.shipping_cost) || 0
      if (cost === 0 && Number(r.delimiter1) > 0 && freeFromHt === 0) freeFromHt = Number(r.delimiter1)
      else if (cost > 0 && flatCostBelowHt === 0) flatCostBelowHt = cost
    }
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const dark  = '#1e293b'
    const gray  = '#64748b'
    const light = '#e2e8f0'

    
    doc.rect(0, 0, doc.page.width, 70).fill(accent)
    doc.fillColor(onAccent).fontSize(20).font('Helvetica-Bold')
      .text(shopName, 50, 24)
    doc.fillColor(onAccent).fontSize(9).font('Helvetica')
      .text('Demande de devis B2B', 50, 50)
    doc.fillColor(onAccent).fontSize(11).font('Helvetica-Bold')
      .text(`Q-${quote.id_quote_request}`, doc.page.width - 150, 30, { width: 100, align: 'right' })
    doc.fillColor(onAccent).fontSize(8).font('Helvetica')
      .text(new Date(quote.date_add).toLocaleDateString('fr-FR'), doc.page.width - 150, 50, { width: 100, align: 'right' })

    let y = 90

    
    
    
    doc.fillColor(accent).fontSize(10).font('Helvetica-Bold').text('CLIENT', 50, y)
    y += 14
    const yClientStart = y
    const colLeftX  = 50
    const colRightX = 310

    
    const displayCompany = quote.legal_name || quote.company
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold')
      .text(`${quote.firstname} ${quote.lastname}`, colLeftX, y, { width: 250 })
    let yL = y + 13
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text(displayCompany, colLeftX, yL, { width: 250 })
    yL += 12
    if (quote.siret) { doc.text(`SIRET : ${quote.siret}`, colLeftX, yL, { width: 250 }); yL += 11 }
    if (quote.naf_code || quote.naf_label) {
      const napLine = [quote.naf_code, quote.naf_label].filter(Boolean).join(' — ')
      doc.text(napLine, colLeftX, yL, { width: 250 }); yL += 11
    } else if (quote.activite) {
      doc.text(quote.activite, colLeftX, yL, { width: 250 }); yL += 11
    }
    if (quote.staff_size) { doc.text(`Effectif : ${quote.staff_size}`, colLeftX, yL, { width: 250 }); yL += 11 }

    
    let yR = yClientStart
    doc.fillColor(dark).fontSize(9).font('Helvetica')
      .text(quote.email, colRightX, yR, { width: 235 })
    yR += 11
    if (quote.phone) { doc.text(quote.phone, colRightX, yR, { width: 235 }); yR += 11 }
    if (quote.address_insee || quote.postal_code || quote.city_insee) {
      const addr = [quote.address_insee, [quote.postal_code, quote.city_insee].filter(Boolean).join(' ')]
        .filter(Boolean).join(', ')
      doc.text(addr, colRightX, yR, { width: 235 }); yR += 11
    }

    y = Math.max(yL, yR) + 14
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(light).lineWidth(0.5).stroke()
    y += 14

    
    doc.fillColor(accent).fontSize(10).font('Helvetica-Bold')
      .text(`PRODUITS DEMANDÉS (${quote.total_items} unité${quote.total_items > 1 ? 's' : ''})`, 50, y)
    y += 14

    
    
    
    const colProd = 50, colRef = 250, colQty = 340, colPu = 380, colSub = 460
    const colProdW = 195, colRefW = 85, colQtyW = 35, colPuW = 75, colSubW = 85
    doc.fillColor(gray).fontSize(7).font('Helvetica-Bold')
      .text('PRODUIT', colProd, y, { width: colProdW })
      .text('RÉF.',    colRef,  y, { width: colRefW })
      .text('QTÉ',     colQty,  y, { width: colQtyW, align: 'right' })
      .text('PU HT',   colPu,   y, { width: colPuW,  align: 'right' })
      .text('TOTAL HT', colSub, y, { width: colSubW, align: 'right' })
    y += 11
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(light).lineWidth(0.5).stroke()
    y += 6

    doc.fontSize(8).font('Helvetica').fillColor(dark)
    for (const it of itemRows) {
      const unit = Number(it.price) || 0
      const subtotal = unit * it.quantity

      
      
      
      
      const nameHeight = doc.heightOfString(it.name, { width: colProdW })
      const rowH = Math.max(12, nameHeight + 4)

      
      
      if (y + rowH > doc.page.height - 60) {
        doc.addPage()
        y = 50
      }
      const rowY = y

      doc.fillColor(dark).font('Helvetica').text(it.name,           colProd, rowY, { width: colProdW })
      doc.fillColor(gray).text(it.reference || '—',                 colRef,  rowY, { width: colRefW, ellipsis: true })
      doc.fillColor(dark).text(String(it.quantity),                 colQty,  rowY, { width: colQtyW, align: 'right' })
      doc.fillColor(gray).text(unit > 0 ? fmtPrice(unit) : '—',     colPu,   rowY, { width: colPuW,  align: 'right' })
      doc.fillColor(dark).font('Helvetica-Bold').text(subtotal > 0 ? fmtPrice(subtotal) : '—', colSub, rowY, { width: colSubW, align: 'right' })
      doc.font('Helvetica')
      y += rowH
    }

    y += 6
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(light).lineWidth(0.5).stroke()
    y += 10

    
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold')
      .text('TOTAL HT', colPu - 60, y, { width: 130, align: 'right' })
      .fillColor(accent)
      .text(totalHt > 0 ? fmtPrice(totalHt) : 'Sur devis', colSub, y, { width: colSubW, align: 'right' })

    
    y += 22
    doc.fillColor(gray).fontSize(8).font('Helvetica')
    if (purchaseMinimum > 0) {
      doc.text(`Minimum de commande : ${fmtPrice(purchaseMinimum)} HT`, 50, y)
      y += 11
    }
    if (carrierName && freeFromHt > 0) {
      doc.text(
        `Frais de port (${carrierName}) : franco à partir de ${fmtPrice(freeFromHt)} HT`
        + (flatCostBelowHt > 0 ? ` — ${fmtPrice(flatCostBelowHt)} HT en-dessous.` : '.'),
        50, y,
      )
    } else if (carrierName && flatCostBelowHt > 0) {
      doc.text(`Frais de port (${carrierName}) : ${fmtPrice(flatCostBelowHt)} HT`, 50, y)
    } else {
      doc.text('Frais de port : en sus, selon transporteur et adresse de livraison.', 50, y)
    }
    
    const warnings: string[] = []
    if (purchaseMinimum > 0 && totalHt > 0 && totalHt < purchaseMinimum) {
      warnings.push(
        `Demande (${fmtPrice(totalHt)} HT) sous le minimum — complément requis : `
        + `${fmtPrice(purchaseMinimum - totalHt)} HT.`,
      )
    }
    if (freeFromHt > 0 && totalHt > 0 && totalHt < freeFromHt && totalHt >= purchaseMinimum) {
      warnings.push(
        `Sous le franco — ajoutez ${fmtPrice(freeFromHt - totalHt)} HT `
        + `pour bénéficier de la livraison offerte.`,
      )
    }
    if (warnings.length) {
      y += 11
      doc.fillColor('#b45309').font('Helvetica-Bold')
      for (const w of warnings) {
        doc.text('⚠ ' + w, 50, y, { width: doc.page.width - 100 })
        y += 11
      }
      doc.fillColor(gray).font('Helvetica')
    }

    
    const footerY = doc.page.height - 40
    doc.fontSize(7).fillColor(gray).font('Helvetica')
      .text(
        `${shopName} — Document généré automatiquement le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        50, footerY, { width: doc.page.width - 100, align: 'center' },
      )

    doc.end()
  })
}
