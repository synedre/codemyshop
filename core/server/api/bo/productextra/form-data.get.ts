

import { getFormData } from '~/modules/product-extra/server/utils/productextra'

import { requireEmployeeSession } from '~/server/utils/session'
export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const data = await getFormData({ event })
  return { success: true, ...data }
})
