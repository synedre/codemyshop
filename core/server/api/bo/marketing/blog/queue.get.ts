

import { requireRoleOrSaas } from '~/server/utils/session'
import {
  listQueueWithCovergen,
  readCadenceCounters,
  sumSpendThisMonth,
} from '~/enterprise/ai/cms-queue/server/utils/cms-queue'
import { formatWindow, loadCadenceSettings, perLanguageCadence } from '~/server/utils/blog-cadence'
import { readShopConfigValue } from '~/server/utils/shop-config'
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  try {
    const settings = await loadCadenceSettings((key) => readShopConfigValue(useClientDb(event), key))
    const [queue, spend, counters] = await Promise.all([
      listQueueWithCovergen({ event }),
      sumSpendThisMonth({ event }),
      readCadenceCounters(settings.timezone, { event }),
    ])
    
    const { verdict, excludeLangs } = perLanguageCadence({
      perDay: settings.perDay,
      publishedByLang: counters.publishedByLang,
      nowMinutes: counters.nowMinutes,
      window: settings.window,
      days: settings.days,
      isoWeekday: counters.isoWeekday,
    })
    return {
      queue,
      spend,
      cadence: {
        state: verdict.state,
        perDay: settings.perDay,
        window: settings.window ? formatWindow(settings.window) : null,
        days: settings.days,
        publishedToday: counters.publishedToday,
        publishedByLang: counters.publishedByLang,
        saturatedLangs: excludeLangs,
        timezone: settings.timezone,
      },
    }
  } catch (err: any) {
    console.error('[bo/blog/queue] DB error:', err?.message)
    return { queue: [], spend: null, cadence: null }
  }
})
