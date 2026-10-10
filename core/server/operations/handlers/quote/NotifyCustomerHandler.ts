

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { sendQuoteRequestEmail } from '~/server/utils/order-emails'
import { signQuotePdfToken } from '~/server/api/quote/[id]/pdf.get'
import { signQuoteRdvToken } from '~/server/utils/quote-rdv-token'
import { t, tFormat } from '~/server/utils/i18n'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sql } from 'drizzle-orm'
import { buildQuoteItemsHtml } from '~/server/utils/quote-items-html'

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export async function NotifyCustomerHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event
    const idQuoteRequest = (event as any)._quoteRequestId as number | undefined
    const quoteRef = idQuoteRequest ? `Q-${idQuoteRequest}` : 'Q-pending'

    
    
    if (!payload.email) {
      console.log(`[NotifyCustomer] Quote ${quoteRef} sans email visiteur — accusé de réception sauté`)
      return
    }

    let shopName = 'Boutique'
    let shopDomain = ''
    try {
      
      
      const rows = await usePocPg().execute<any>(sql`
        SELECT name, value FROM cs_main.ps_configuration
         WHERE name IN ('PS_SHOP_NAME','PS_SHOP_DOMAIN')
      `) as any[]
      for (const r of rows) {
        if (r.name === 'PS_SHOP_NAME' && r.value) shopName = String(r.value)
        if (r.name === 'PS_SHOP_DOMAIN' && r.value) shopDomain = String(r.value)
      }
    } catch (err: any) {
      console.warn('[NotifyCustomer] config lookup KO:', err?.message)
    }

    
    
    const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    
    
    
    
    const idLang = 1
    const { html: itemsHtml, totalHt } = await buildQuoteItemsHtml(payload.items)
    const totalLabel = totalHt > 0
      ? tFormat(
          await t('quote_email_total_with_disclaimer', idLang, '{total} HT'),
          { total: formatPrice(totalHt) },
        )
      : await t('quote_email_total_pending', idLang, 'Sur devis — proposition tarifaire à venir')

    
    
    
    
    const psFrontHost = String(useRuntimeConfig().public.psFrontUrl || '')
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const domain = shopDomain || psFrontHost || ''

    
    let quotePdfUrl = ''
    if (idQuoteRequest) {
      const token = signQuotePdfToken(idQuoteRequest)
      quotePdfUrl = `https://${domain}/api/quote/${idQuoteRequest}/pdf?token=${token}`
    }

    
    
    
    
    
    
    let rdvUrl = `https://${domain}/rdv`
    if (idQuoteRequest) {
      const rdvToken = signQuoteRdvToken(idQuoteRequest)
      rdvUrl += `?quote=${idQuoteRequest}&t=${rdvToken}`
    }

    
    
    const validateQuoteUrl = (event as any)._cartUrl as string | undefined

    
    
    
    await sendQuoteRequestEmail({
      customerEmail: payload.email,
      firstname:     payload.firstname,
      company:       payload.company,
      quoteRef,
      totalItems:    payload.totalItems,
      shopName,
      itemsHtml,
      total:         totalLabel,
      validUntil,
      quotePdfUrl,
      rdvUrl,
      quoteIdForPdf: idQuoteRequest,
      validateQuoteUrl,
    })

    console.log(`[NotifyCustomer] Quote ${quoteRef} ack sent to ${payload.email}`)
  } catch (err: any) {
    console.error('[NotifyCustomer] Email send failed:', err?.message || err)
  }
}
