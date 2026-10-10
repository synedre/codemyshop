

import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'
import { getShopConfig } from '~/server/utils/shop-config'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const email = String(q.email ?? '').trim()
  if (!email) return { status: 'invalid_input' as const }
  const shop = await getShopConfig(event).catch(() => null)
  const r = await verifyEmailViaSmtp(email, {
    heloDomain: shop?.shopDomain || undefined,
    mailFrom:   shop?.shopEmail  || undefined,
  })
  return { status: r.status, mxHost: r.mxHost ?? null }
})
