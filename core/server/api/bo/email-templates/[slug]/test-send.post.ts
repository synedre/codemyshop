

import { sendEmailViaQueue } from '~/server/utils/email-queue'
import { loadEmailTemplate } from '~/server/utils/email-template-loader'
import { renderEmailTemplate } from '~/server/utils/email-template-render'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sql } from 'drizzle-orm'

import { requireEmployeeSession } from '~/server/utils/session'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

const SAMPLE_PRODUCTS_TABLE = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:12px 0;">
<thead><tr style="background:#f8fafc;">
<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Produit</th>
<th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Qté</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Prix unit.</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Sous-total HT</th>
</tr></thead>
<tbody>
<tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">Olives noires Kalamata 5kg</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">3</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#475569;white-space:nowrap;">12,60 € <span style="font-size:11px;color:#94a3b8;font-weight:500;">HT/K</span></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;font-weight:600;white-space:nowrap;">189,00 €</td></tr>
<tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">Pistaches d'Iran 10kg</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">2</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#475569;white-space:nowrap;">20,64 € <span style="font-size:11px;color:#94a3b8;font-weight:500;">HT/K</span></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;font-weight:600;white-space:nowrap;">412,80 €</td></tr>
<tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">Sachet thé vert bio 100g (boîte de 12)</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">5</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#475569;white-space:nowrap;">3,15 € <span style="font-size:11px;color:#94a3b8;font-weight:500;">HT/U</span></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;font-weight:600;white-space:nowrap;">189,00 €</td></tr>
</tbody>
</table>
<p style="font-size:11px;color:#94a3b8;margin:8px 0 0;font-style:italic;">Tarif catalogue HT — sujet à négociation commerciale selon volumes et récurrence.</p>`

const SAMPLE_VALIDATE_QUOTE_HTML = `<div style="margin:28px 0;text-align:center;">
  <a href="#test-link-cart" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:18px 40px;border-radius:10px;font-weight:700;font-size:17px;letter-spacing:0.02em;box-shadow:0 6px 12px -2px rgba(220,38,38,0.35);mso-padding-alt:0;">
    <span style="display:inline-block;vertical-align:middle;margin-right:10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </span><span style="vertical-align:middle;">Valider le devis</span>
  </a>
  <p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">Accès direct à votre panier — finalisez en quelques clics</p>
</div>`

const COMMON_VARS = {
  firstname: 'Marie',
  lastname:  'Dupont',
  email:     'marie.dupont@exemple-pro.fr',
  company:   'Acme Distribution SAS',
}

const SAMPLE_VARS_BY_SLUG: Record<string, Record<string, string>> = {
  account_confirmation: {
    ...COMMON_VARS,
  },
  order_confirmation: {
    ...COMMON_VARS,
    order_name:          '#PAL2026-1234',
    date:                new Date().toLocaleDateString('fr-FR'),
    products:            SAMPLE_PRODUCTS_TABLE,
    total_paid:          '789,55 €',
    total_products:      '689,55 €',
    total_shipping:      '100,00 €',
    delivery_block_html: 'Marie Dupont<br>12 rue du Marché<br>75011 Paris',
    payment:             'Virement bancaire',
    carrier:             'Chronopost Express',
    history_url:         '#test-link-historique',
  },
  order_payment_pending: {
    ...COMMON_VARS,
    order_name:        '#PAL2026-1234',
    bankwire_owner:    'Example Shop SARL',
    bankwire_details:  'IBAN : FR76 1234 5678 9012 3456 7890 123\nBIC : ABCDEFGHIJK',
    bankwire_address:  '15 av. de la République, 75011 Paris',
    total_paid:        '789,55 €',
    history_url:       '#test-link-historique',
  },
  password_reset: {
    firstname:  'Marie',
    date:       new Date().toLocaleDateString('fr-FR'),
    url:        '#test-link-reset-password',
  },
  order_shipped: {
    ...COMMON_VARS,
    order_name:    '#PAL2026-1234',
    date:          new Date().toLocaleDateString('fr-FR'),
    history_url:   '#test-link-historique',
  },
  quote_request: {
    ...COMMON_VARS,
    quote_ref:           'DV2026-0042',
    valid_until:         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    quote_items_html:    SAMPLE_PRODUCTS_TABLE,
    quote_total:         '790,80 € HT (tarif catalogue, hors remise commerciale)',
    quote_url:           '#test-link-devis',
    quote_pdf_url:       '#test-link-pdf',
    validate_quote_url:  '#test-link-cart',
    validate_quote_html: SAMPLE_VALIDATE_QUOTE_HTML,
    rdv_url:             '#test-link-rdv',
  },
  admin_new_order: {
    ...COMMON_VARS,
    order_name:               '#ACME2026-1234',
    order_ref:                'ACME2026-1234',
    customer_name:            'Marie Dupont',
    customer_email:           'marie.dupont@exemple-pro.fr',
    customer_phone:           '01 42 00 00 00',
    customer_phone_line_html: '<p style="margin:0 0 8px;font-size:13px;color:#475569;">☎ 01 42 00 00 00</p>',
    company_line_html:        '<p style="margin:0 0 8px;font-size:13px;color:#475569;">Acme Distribution SAS</p>',
    
    
    
    siren_line_html:          '<p style="margin:0 0 8px;font-size:13px;color:#475569;">SIREN&nbsp;: <span style="font-family:monospace;color:#0f172a;">552100554</span></p>',
    siren:                    '552100554',
    date:                     new Date().toLocaleDateString('fr-FR'),
    total_paid:               '789,55 €',
    payment:                  'Carte bancaire (SystemPay)',
    products:                 SAMPLE_PRODUCTS_TABLE,
    id_order:                 '1234',
    delivery_address_html:    'Marie Dupont<br>Acme Distribution SAS<br>12 rue du Marché<br>75011 Paris<br>France',
    invoice_address_html:     '<div style="font-size:13px;color:#64748b;font-style:italic;">Identique à l\'adresse de livraison</div>',
    same_address:             '1',
    carrier_name:             'Retrait en magasin',
    carrier_block_html:       `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin:0 0 24px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;">🚚 Transporteur</p>
<p style="margin:0;font-size:15px;color:#0f172a;font-weight:600;">Retrait en magasin</p>
</td></tr>
</table>
`,
    customer_message:           'Merci d\'appeler 30 min avant le retrait, accès quai 12 derrière le bâtiment principal.',
    customer_message_block_html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:10px;border:1px solid #fde68a;margin:0 0 24px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.04em;">💬 Commentaire du client</p>
<p style="margin:0;font-size:14px;color:#0f172a;line-height:1.5;white-space:pre-line;">Merci d&#39;appeler 30 min avant le retrait, accès quai 12 derrière le bâtiment principal.</p>
</td></tr>
</table>
`,
    vat_legal_mention_html: `<p style="margin:12px 0 0;padding:10px 14px;background:#f0f9ff;border-left:3px solid #0ea5e9;font-size:11px;color:#075985;line-height:1.45;">
<strong>Mention légale :</strong> TVA non applicable — Auto-liquidation par le preneur, article 262 ter I du Code Général des Impôts.<br><span style="font-family:monospace;color:#1e293b;">N° TVA : DE123456789</span>
</p>`,
    vat_context_kind: 'eu_autoliq_b2b',
  },
  admin_contact_form: {
    ...COMMON_VARS,
    message:     'Bonjour, je souhaiterais obtenir un devis pour 50kg d\'olives Kalamata + 20kg de pistaches premium. Livraison Paris 11e dans la semaine si possible. Merci de me recontacter.',
  },
  admin_stock_alert: {
    product_name:      'Olives noires Kalamata 5kg',
    product_reference: 'OLV-KAL-5KG-A',
  },
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug requis' })

  const body = await readBody(event) as { id_lang?: number; to?: string }
  const idLang = Number(body?.id_lang ?? 1)
  const to = String(body?.to || '').trim()

  if (!to || !EMAIL_RE.test(to)) {
    throw createError({ statusCode: 422, statusMessage: 'Email destinataire invalide' })
  }

  const tpl = await loadEmailTemplate(slug, idLang)
  if (!tpl) {
    throw createError({
      statusCode: 404,
      statusMessage: `Template ${slug} (lang ${idLang}) introuvable en DB`,
    })
  }

  const sampleVars = SAMPLE_VARS_BY_SLUG[slug] ?? COMMON_VARS

  const subject = `[TEST] ${renderEmailTemplate(tpl.subject, sampleVars)}`
  const html = renderEmailTemplate(tpl.htmlBody, sampleVars)

  
  
  
  let attachmentMeta: { type: 'quote_pdf'; quoteId: number } | undefined
  if (slug === 'quote_request') {
    try {
      const rows = await usePocPg().execute<any>(sql`
        SELECT id_quote_request FROM cs_main.cs_quote_request
         ORDER BY id_quote_request DESC LIMIT 1
      `) as any[]
      const latestId = Number(rows[0]?.id_quote_request || 0)
      if (latestId > 0) attachmentMeta = { type: 'quote_pdf', quoteId: latestId }
    } catch (err: any) {
      console.warn('[email-templates/test-send] PDF attach skip (no quote_request in DB):', err?.message)
    }
  }

  
  
  
  const result = await sendEmailViaQueue({
    to, subject, html,
    templateSlug: slug, idLang,
    ...(attachmentMeta ? { attachmentMeta } : {}),
  })
  if (!result.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Enqueue échoué : ${result.error || 'erreur DB'}`,
    })
  }

  return {
    ok: true,
    id: result.id,
    to,
    slug,
    id_lang: idLang,
    sample_vars_count: Object.keys(sampleVars).length,
    queued: true,
  }
})
