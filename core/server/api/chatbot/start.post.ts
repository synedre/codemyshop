

import { sql } from 'drizzle-orm'
import { startConversation, toChatbotHttpError } from '~/server/utils/chatbot-engine'
import { resolveProductScenario } from '~/server/utils/chatbot-tree'
import { resolveIdLang } from '~/server/utils/lang'
import { getCustomerSession } from '~/server/utils/customer-session'
import { useClientDb } from '~/server/utils/db'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { scenario?: string; productId?: number; qty?: number }
  const ipAddress = getRequestHeader(event, 'cf-connecting-ip')
    || getRequestHeader(event, 'x-real-ip')
    || (getRequestIP(event, { xForwardedFor: true }) || '')
  const userAgent = getRequestHeader(event, 'user-agent') || ''

  let scenario = String(body?.scenario || '').trim() || 'global'
  const session = getCustomerSession(event)
  const isCustomer = !!session && (session as any).userType === 'customer'
  if (scenario === 'product') {
    scenario = resolveProductScenario(isCustomer)
  }

  try {
    const dto = await startConversation({
      scenario,
      productId:  body?.productId ? Number(body.productId) : null,
      initialQty: body?.qty ? Number(body.qty) : null,
      ipAddress,
      userAgent,
      idLang: await resolveIdLang(event),
    }, { event })

    
    
    
    
    if (isCustomer && session) {
      try {
        const db = useClientDb(event)
        const customerId = Number((session as any).customerId || 0)
        const cust = customerId > 0 ? await db.get<any>(
          `SELECT firstname, lastname, email, IFNULL(company,'') AS company, IFNULL(siret,'') AS siret
             FROM ps_customer WHERE id_customer = ? LIMIT 1`,
          [customerId],
        ) : null
        if (cust) {
          await usePocPg().execute(sql`
            UPDATE cs_main.cs_chatbot_conversation
               SET captured_firstname = ${String(cust.firstname || '')},
                   captured_lastname  = ${String(cust.lastname  || '')},
                   captured_email     = ${String(cust.email     || '').toLowerCase()},
                   captured_company   = ${String(cust.company   || '')},
                   captured_siret     = ${String(cust.siret     || '').replace(/\D/g, '')},
                   date_upd           = NOW()
             WHERE id_conversation = ${dto.conversationId}
          `)
        }
      } catch (err: any) {
        console.warn('[chatbot/start] pré-remplissage customer KO:', err?.message)
      }
    }

    return {
      ok: true,
      conversationId:    dto.conversationId,
      conversationToken: dto.conversationToken,
      message: {
        nodeKey:  dto.nodeKey,
        type:     dto.type,
        content:  dto.content,
        options:  dto.options,
        terminal: dto.terminal,
      },
    }
  } catch (err: any) {
    throw toChatbotHttpError(err, 'start')
  }
})
