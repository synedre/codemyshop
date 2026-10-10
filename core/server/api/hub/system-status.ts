

import type { VisitorAvatar } from '~/types/avatar'
import { resolveFsStorageBase } from '~/server/utils/fs-storage-base'
import { resolveClientId } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const config  = useRuntimeConfig()
  const storage = useStorage('avatars')

  
  const hasApiKey    = !!config.anthropicApiKey
  const aiMode       = hasApiKey ? 'active' : 'stub'
  const aiSourceType = config.aiSourceType ?? 'contact_form'
  const aiClientId   = String(config.aiClientId || resolveClientId())

  
  let avatarTotal  = 0
  const distribution: Record<string, number> = {}

  try {
    const keys        = await storage.getKeys()
    const clientKeys  = keys.filter(k => k.startsWith(`${aiClientId}:`))
    avatarTotal       = clientKeys.length

    for (const key of clientKeys) {
      const avatar = await storage.getItem<VisitorAvatar>(key)
      if (!avatar) continue
      distribution[avatar.type] = (distribution[avatar.type] ?? 0) + 1
    }
  } catch {
    
  }

  
  
  const newsletterProvider = 'Non configuré'
  const newsletterStatus   = 'pending' as 'active' | 'pending' | 'error'

  return {
    ai: {
      mode:       aiMode,
      hasApiKey,
      sourceType: aiSourceType,
      clientId:   aiClientId,
      model:      'claude-sonnet-4-6',
    },
    avatars: {
      total:        avatarTotal,
      distribution,
      storageDriver: 'fs',
      
      
      
      
      storagePath:   resolveFsStorageBase('avatars'),
    },
    newsletter: {
      provider: newsletterProvider,
      status:   newsletterStatus,
    },
    checkedAt: new Date().toISOString(),
  }
})
