

import { buildSystempayForm } from '~/server/utils/systempay-form'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { orderId, orderReference, amount, customerEmail } = body

  return await buildSystempayForm(event, { orderId, orderReference, amount, customerEmail })
})
