

import { useClientDb } from '~/server/utils/db'
import { resolveShopIdentity } from '~/server/utils/shop-identity'
import { sendCartRecoveryEmail } from '~/server/utils/order-emails'
import { getThemePrimaryColor } from '~/modules/theme/server/utils/theme'

import { requireEmployeeSession } from '~/server/utils/session'

interface CartRow {
  id_cart: number
  id_customer: number
  email: string
  firstname: string
  lastname: string
  company: string | null
  items_count: number
  total_estimated: number
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n) + ' HT'
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const body = await readBody<{ id_carts?: number[]; test_email?: string }>(event)
  const ids = (body?.id_carts || []).map(Number).filter(Number.isFinite)
  if (!ids.length) {
    throw createError({ statusCode: 400, message: 'id_carts requis (array d\'int)' })
  }
  const testEmail = (body?.test_email || '').trim()
  if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    throw createError({ statusCode: 400, message: 'test_email invalide' })
  }

  const db = useClientDb(event)
  
  
  
  let shopUrl: string
  let shopName: string
  try {
    ({ shopUrl, shopName } = resolveShopIdentity(useRuntimeConfig().public as any))
  } catch (err: any) {
    throw createError({ statusCode: 500, message: String(err?.message || err) })
  }
  const shopColor = (await getThemePrimaryColor({ event }).catch(() => null)) || '#4F46E5'

  
  
  const idsCsv = ids.map(Number).join(',')
  const carts = await db.query<CartRow>(`
    SELECT c.id_cart,
           c.id_customer,
           cu.email,
           cu.firstname,
           cu.lastname,
           cu.company,
           COUNT(cp.id_product) AS items_count,
           COALESCE(SUM(cp.quantity * pp.price), 0) AS total_estimated
      FROM ps_cart c
      JOIN ps_customer cu ON cu.id_customer = c.id_customer AND cu.active = 1
      LEFT JOIN ps_cart_product cp ON cp.id_cart = c.id_cart
      LEFT JOIN ps_product pp ON pp.id_product = cp.id_product
     WHERE c.id_cart IN (${idsCsv})
     GROUP BY c.id_cart, c.id_customer, cu.email, cu.firstname, cu.lastname, cu.company
     HAVING COUNT(cp.id_product) > 0
  `)

  let queued = 0
  let errors = 0
  const isTest = !!testEmail

  for (const cart of carts) {
    if (!isTest && !cart.email) {
      try {
        await db.run(
          `INSERT INTO cs_cart_recovery (id_cart, id_customer, sent_at, status, error_msg)
                VALUES (?, ?, NOW(), 'error', 'email vide')`,
          [cart.id_cart, cart.id_customer],
        )
      } catch {  }
      errors++
      continue
    }

    const firstname = (cart.firstname || '').trim() || 'Cher client'
    const company = (cart.company || '').trim()
    const salutation = `Bonjour ${firstname}` + (company ? ` (${company})` : '')
    const cartUrl = `${shopUrl}/panier?recover=${cart.id_cart}`
    const totalHt = formatPrice(Number(cart.total_estimated))
    const to = isTest ? testEmail : cart.email
    const subjectPrefix = isTest ? `[TEST ${cart.id_cart}]` : ''

    try {
      await sendCartRecoveryEmail({
        to,
        firstname,
        salutation,
        itemsCount:    Number(cart.items_count),
        totalHt,
        cartUrl,
        shopName,
        accentColor:   shopColor,
        subjectPrefix,
      })
      queued++

      if (!isTest) {
        try {
          await db.run(
            `INSERT INTO cs_cart_recovery (id_cart, id_customer, sent_at, status)
                  VALUES (?, ?, NOW(), 'queued')`,
            [cart.id_cart, cart.id_customer],
          )
        } catch (err: any) {
          
          console.warn('[abandoned-carts] log INSERT skipped:', err?.message)
        }
      }
    } catch (err: any) {
      errors++
      console.error(`[abandoned-carts/send] enqueue KO cart#${cart.id_cart}:`, err?.message || err)
      if (!isTest) {
        try {
          await db.run(
            `INSERT INTO cs_cart_recovery (id_cart, id_customer, sent_at, status, error_msg)
                  VALUES (?, ?, NOW(), 'error', ?)`,
            [cart.id_cart, cart.id_customer, String(err?.message || err).slice(0, 500)],
          )
        } catch {  }
      }
    }
  }

  return {
    ok: true,
    queued,           
    sent: queued,     
    errors,
    total: carts.length,
    test_mode: isTest,
  }
})
