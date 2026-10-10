

import { resolveSectionsResponse, type PageSection } from '~/server/utils/page-sections-response'

export default defineEventHandler(async (event): Promise<{ sections: PageSection[] }> => {
  const query = getQuery(event)
  const includeAll = query.all === '1' || query.all === 'true'
  const parentType = typeof query.parent_type === 'string' && query.parent_type ? query.parent_type : 'homepage'
  const parentIdRaw = typeof query.parent_id === 'string' ? Number(query.parent_id) : NaN
  const parentId = Number.isInteger(parentIdRaw) ? parentIdRaw : 0
  return resolveSectionsResponse(event, { includeAll, parentType, parentId })
})
