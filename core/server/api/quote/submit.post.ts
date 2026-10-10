

import { z } from 'zod'
import { eventBus } from '~/server/operations/bus/EventBus'
import { createQuoteRequestedEvent, type QuoteAdAttribution } from '~/server/operations/events/QuoteRequestedEvent'
import { saveQuoteRequestCritical } from '~/server/operations/handlers/quote/SaveToDatabaseHandler'
import { rateLimit } from '~/server/utils/redis'
import { resolveAdAttribution } from '~/server/utils/ad-attribution'
import { resolveIdLang } from '~/server/utils/lang'
import { loadWizard } from '~/modules/quote-wizard/server/utils/quote-wizard'
import { colonnesRequises, erreurDemandeQuestionnaire } from '~/utils/quote-wizard-validation'

const QuoteItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  reference: z.string().optional(),
  quantity: z.number().int().min(1),
})

const QuoteSubmitSchema = z.object({
  firstname: z.string().min(1, 'Prénom requis').transform(s => s.trim()),
  lastname: z.string().min(1, 'Nom requis').transform(s => s.trim()),
  email: z.string().email('Email invalide').transform(s => s.trim().toLowerCase()),
  phone: z.string().optional().default('').transform(s => s.trim()),
  company: z.string().min(1, 'Entreprise requise').transform(s => s.trim()),
  
  
  siret: z.string()
    .min(1, 'SIRET requis')
    .transform(s => s.replace(/\s+/g, '').trim())
    .refine(s => /^\d{14}$/.test(s), 'SIRET invalide (14 chiffres attendus)'),
  activite: z.string().optional().default('').transform(s => s.trim()),
  message: z.string().optional().default('').transform(s => s.trim()),
  
  
  
  items: z.array(QuoteItemSchema).default([]),
})

const texte = z.string().optional().default('').transform(s => s.trim())
const QuoteWizardSubmitSchema = z.object({
  firstname: texte, lastname: texte, phone: texte, company: texte, activite: texte, message: texte,
  email: texte.transform(s => s.toLowerCase()),
  siret: z.string().optional().default('').transform(s => s.replace(/\s+/g, '').trim()),
  items: z.array(QuoteItemSchema).default([]),
})

export default defineEventHandler(async (event) => {
  
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`quote-submit:${ip}`, 5, 600))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de demandes de devis. Réessayez dans quelques minutes.',
      data: { code: 'RATE_LIMITED' },
    })
  }

  const body = await readBody(event)

  
  const wizardCode = String((useRuntimeConfig(event).public as any)?.quoteWizardCode ?? '').trim()
  const charge = wizardCode ? await loadWizard(wizardCode, await resolveIdLang(event)) : null
  const wizard = charge?.steps.length ? charge : null
  const parsed = (wizard ? QuoteWizardSubmitSchema : QuoteSubmitSchema).safeParse(body)

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Données invalides'
    throw createError({ statusCode: 400, message: firstError })
  }

  const data = parsed.data
  if (wizard) {
    const erreur = erreurDemandeQuestionnaire(data, colonnesRequises(wizard.steps.flatMap(s => s.fields)))
    if (erreur) throw createError({ statusCode: 400, message: erreur })
  }

  
  
  
  
  
  
  
  
  const attribution: QuoteAdAttribution | null = resolveAdAttribution(event, body?.attribution)

  const payload = {
    ...data,
    totalItems: data.items.reduce((s, i) => s + i.quantity, 0),
    attribution,
  }
  const domainEvent = createQuoteRequestedEvent(payload)

  
  
  
  
  
  let idQuoteRequest: number
  try {
    idQuoteRequest = await saveQuoteRequestCritical(payload)
  } catch (err: any) {
    console.error('[quote/submit] INSERT failed:', err?.message || err)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service temporairement indisponible — réessayez dans quelques minutes',
      data: { code: 'SERVICE_UNAVAILABLE' },
    })
  }
  
  
  ;(domainEvent as any)._quoteRequestId = idQuoteRequest

  
  eventBus.publish(domainEvent)

  
  return { success: true, eventId: domainEvent.id, id: idQuoteRequest }
})
