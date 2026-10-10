

import { addProductToConversation, toChatbotHttpError } from '~/server/utils/chatbot-engine'
import { getCustomerSession } from '~/server/utils/customer-session'
import { resolveIdLang } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    conversationId?: number | string
    conversationToken?: string
    productId?: number | string
    qty?: number | string
  }
  const conversationId = Number(body?.conversationId)
  const conversationToken = String(body?.conversationToken || '')
  const productId = Number(body?.productId)
  if (!conversationId || !conversationToken || !productId) {
    throw createError({ statusCode: 400, statusMessage: 'conversationId + token + productId requis', data: { code: 'CHATBOT_MISSING_PARAMS' } })
  }

  const session = getCustomerSession(event)
  const isCustomer = !!session && (session as any).userType === 'customer'
  try {
    const dto = await addProductToConversation({
      conversationId,
      conversationToken,
      productId,
      initialQty: Number(body?.qty || 0),
      isCustomer,
      idLang: await resolveIdLang(event),
    }, { event })
    return {
      ok: true,
      nodeKey:  dto.nodeKey,
      type:     dto.type,
      content:  dto.content,
      options:  dto.options || [],
      terminal: dto.terminal,
    }
  } catch (err: any) {
    throw toChatbotHttpError(err, 'add-product')
  }
})
