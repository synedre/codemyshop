

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { crmCreateLeadProject } from '~/server/utils/crm-direct'
import { linkCrmToQuoteRequest } from '~/modules/quote-request/server/utils/quote-request'
import { resolveClientId } from '~/server/utils/db'

export async function PushToCrmHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event

    const clientId = process.env.NUXT_CLIENT_ID || process.env.NUXT_PUBLIC_CLIENT_ID || resolveClientId()

    const crmResult = await crmCreateLeadProject({
      email: payload.email,
      firstname: payload.firstname,
      lastname: payload.lastname,
      phone: payload.phone,
      companyName: payload.company,
      profession: payload.activite,
      referenceClient: payload.siret,
      leadSource: 'demande_devis',
      projectType: 'devis',
      projectIntention: 'achat_grossiste',
      itemsJson: JSON.stringify(payload.items),
      message: payload.message,
    }, { clientId })

    if (crmResult.success && crmResult.leadId && crmResult.projectId) {
      console.log(`[PushToCrm] Lead #${crmResult.leadId} + Project #${crmResult.projectId}`)

      
      ;(event as any)._projectId = crmResult.projectId
      ;(event as any)._leadId    = crmResult.leadId

      const quoteRequestId = (event as any)._quoteRequestId
      if (quoteRequestId) {
        await linkCrmToQuoteRequest(quoteRequestId, crmResult.leadId, crmResult.projectId, { global: true })
      }
    } else {
      console.error('[PushToCrm] CRM error:', crmResult.error || 'unknown')
    }

    
    
    
    try {
      const { syncLead } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-sync')
      const { enqueueSfOutbox } = await import('~/enterprise/data/sf-connector/server/utils/salesforce-outbox')
      const sfInput = {
        firstName:   payload.firstname,
        lastName:    payload.lastname || '-',
        email:       payload.email,
        company:     payload.company,
        siret:       payload.siret || undefined,
        phone:       payload.phone || undefined,
        description: payload.message || undefined,
        leadSource:  'Site web',
        mode:        'realtime' as const,
      }
      const sfResult = await syncLead(sfInput)
      if (sfResult.status === 'failed') {
        await enqueueSfOutbox(sfInput)
        console.warn(`[PushToCrm:sf] sync failed (enqueued) — ${sfResult.errorMessage}`)
      } else if (sfResult.status !== 'disabled') {
        console.log(`[PushToCrm:sf] SF sync ${sfResult.status} sfId=${('sfId' in sfResult ? sfResult.sfId : '') ?? ''} (${sfResult.durationMs}ms)`)
      }
    } catch (sfErr: any) {
      if (!sfErr?.message?.includes('Cannot find module') && !sfErr?.message?.includes('Failed to resolve')) {
        console.warn('[PushToCrm:sf] SF sync error:', sfErr?.message)
      }
    }
  } catch (err: any) {
    console.error('[PushToCrm] CRM direct failed:', err?.message || err)
  }
}
