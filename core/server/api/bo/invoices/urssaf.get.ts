

import { listUrssafDeclarations } from '~/enterprise/banking/urssaf/server/utils/urssaf'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const q = getQuery(event) as Record<string, string>
  const months = Math.min(36, Math.max(1, Number(q.months || 12)))

  try {
    const declarations = await listUrssafDeclarations(months, { event })
    return { declarations }
  } catch (err: any) {
    console.error('[bo/invoices/urssaf] DB error:', err?.message)
    return { declarations: [] }
  }
})
