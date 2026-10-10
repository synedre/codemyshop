

import { adsId, appelsAchat, appelsDebutPaiement, appelsLead, ga4Id, suiviActif, type AppelGtag } from '~/utils/analytics-events'

interface PurchaseItem {
  item_id?: string
  item_name?: string
  price?: number
  quantity?: number
}

interface PurchasePayload {
  transactionId: string
  value: number
  currency?: string
  items?: PurchaseItem[]
}

interface LeadPayload {
  leadId: string
  
  source?: 'devis' | 'contact'
  

  value?: number
  currency?: string
}

export function useAnalytics() {
  const dbConfig = useState<Record<string, any> | null>('client_db_config', () => null)
  const analytics = computed(() => (dbConfig.value as any)?.analytics ?? null)
  const ga4MeasurementId = computed<string | null>(() => ga4Id(analytics.value) ?? null)
  
  
  const enabled = computed(() => suiviActif(analytics.value))
  
  const hasAds = computed(() => !!adsId(analytics.value))

  function gtagSafe(...args: any[]): boolean {
    if (import.meta.server) return false
    const g = (window as any).gtag
    if (typeof g !== 'function') return false
    g(...args)
    return true
  }

  
  function emettre(appels: AppelGtag[]): boolean {
    if (!appels.length) return false
    let ok = false
    for (const a of appels) ok = gtagSafe(...a) || ok
    return ok
  }

  
  function dejaEmis(cle: string, id: string): boolean {
    const w = window as any
    w.__cmsTrackedEvents = w.__cmsTrackedEvents || {}
    const vus: Set<string> = (w.__cmsTrackedEvents[cle] = w.__cmsTrackedEvents[cle] || new Set<string>())
    return vus.has(id)
  }
  function marquer(cle: string, id: string) {
    ;(window as any).__cmsTrackedEvents[cle].add(id)
  }

  
  function trackPurchase(p: PurchasePayload) {
    if (import.meta.server || !enabled.value || !p?.transactionId) return
    if (dejaEmis('purchase', p.transactionId)) return
    if (emettre(appelsAchat(analytics.value, p))) marquer('purchase', p.transactionId)
  }

  
  function trackLead(p: LeadPayload) {
    if (import.meta.server || !enabled.value || !p?.leadId) return
    if (dejaEmis('lead', p.leadId)) return
    if (emettre(appelsLead(analytics.value, p))) marquer('lead', p.leadId)
  }

  

  function trackBeginCheckout(cle: string, p: { value?: number; currency?: string } = {}) {
    if (import.meta.server || !enabled.value || !cle) return
    if (dejaEmis('begin_checkout', cle)) return
    if (emettre(appelsDebutPaiement(analytics.value, p))) marquer('begin_checkout', cle)
  }

  

  function updateConsent(granted: boolean) {
    const v = granted ? 'granted' : 'denied'
    gtagSafe('consent', 'update', {
      ad_storage: v,
      ad_user_data: v,
      ad_personalization: v,
      analytics_storage: v,
    })
  }

  return { enabled, hasAds, ga4MeasurementId, trackPurchase, trackLead, trackBeginCheckout, updateConsent }
}
