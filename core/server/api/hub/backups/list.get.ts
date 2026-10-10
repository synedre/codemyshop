

import { listS3Objects } from '~/server/utils/s3-sign'
import { resolveClientId } from '~/server/utils/db'
import { resolveBackupPrefix } from '~/server/utils/backup-prefix'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  
  
  requireEmployeeSession(event)
  const cfg = useRuntimeConfig(event)
  if (!cfg.scwAccessKey || !cfg.scwSecretKey) {
    throw createError({
      statusCode: 503,
      message: 'Backups Scaleway non configurés sur ce tenant (SCW_* env vars manquantes)',
    })
  }

  
  
  
  const clientId = resolveClientId(event)
  const tenant = resolveBackupPrefix(clientId, cfg.backupS3Prefix)
  if (!tenant) {
    throw createError({
      statusCode: 404,
      message: `Pas de backup référencé pour le tenant '${clientId}'`,
    })
  }

  try {
    const objects = await listS3Objects({
      accessKey: cfg.scwAccessKey as string,
      secretKey: cfg.scwSecretKey as string,
      region:    cfg.scwRegion as string,
      endpoint:  cfg.scwEndpoint as string,
      bucket:    cfg.scwBucket as string,
    }, `${tenant}/`)

    
    objects.sort((a, b) => b.lastModified.localeCompare(a.lastModified))

    return {
      tenant,
      bucket: cfg.scwBucket,
      count: objects.length,
      objects: objects.map(o => ({
        key: o.key,
        
        date: o.key.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '',
        size: o.size,
        lastModified: o.lastModified,
      })),
    }
  } catch (err: any) {
    console.error('[hub/backups/list] error:', err.message)
    throw createError({ statusCode: 500, message: 'S3 error: ' + err.message })
  }
})
