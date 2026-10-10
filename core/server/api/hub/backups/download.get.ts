

import { presignS3GetUrl, listS3Objects } from '~/server/utils/s3-sign'
import { resolveClientId } from '~/server/utils/db'
import { resolveBackupPrefix } from '~/server/utils/backup-prefix'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  
  requireEmployeeSession(event)
  const cfg = useRuntimeConfig(event)
  if (!cfg.scwAccessKey || !cfg.scwSecretKey) {
    throw createError({ statusCode: 503, message: 'Backups Scaleway non configurés' })
  }

  const q = getQuery(event)
  const date = String(q.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: 'date doit être au format YYYY-MM-DD' })
  }

  
  
  
  const clientId = resolveClientId(event)
  const tenant = resolveBackupPrefix(clientId, cfg.backupS3Prefix)
  if (!tenant) {
    throw createError({ statusCode: 404, message: `Pas de backup pour '${clientId}'` })
  }

  
  
  
  
  const s3cfg = {
    accessKey: cfg.scwAccessKey as string,
    secretKey: cfg.scwSecretKey as string,
    region:    cfg.scwRegion as string,
    endpoint:  cfg.scwEndpoint as string,
    bucket:    cfg.scwBucket as string,
  }
  const objects = await listS3Objects(s3cfg, `${tenant}/`)
  const match = objects.find(o => o.key.includes(date) && o.key.endsWith('.sql.gz'))
  if (!match) {
    throw createError({ statusCode: 404, message: `Aucun backup pour ${tenant} le ${date}` })
  }
  const path = match.key
  const url = presignS3GetUrl({
    ...s3cfg,
  }, path, 300)

  
  
  await sendRedirect(event, url, 302)
})
