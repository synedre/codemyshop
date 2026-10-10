

import { listExpertise } from '~/server/utils/expertise-db'
import { isMissingTable } from '~/server/utils/missing-table'

export default defineEventHandler(async (event) => {
  const { category = '', limit = '200', difficulty = '', all = '' } = getQuery(event)

  
  
  try {
    return await listExpertise({
      category: category ? String(category) : undefined,
      difficulty: difficulty ? String(difficulty) : undefined,
      limit: Number(limit) || 200,
      includeFuture: !!all,
    })
  } catch (err: any) {
    if (!isMissingTable(err)) throw err
    console.warn('[expertise] cs_expertise absente sur ce tenant → []')
    return []
  }
})
