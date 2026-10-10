

import { getNextTopic } from '../../services/content-intelligence'
import { resolveClientId } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clientId = (query.clientId as string) || resolveClientId(event)

  const topic = await getNextTopic(clientId)
  return topic
})
