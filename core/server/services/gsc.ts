

import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { readGlobalSecret } from '~/server/utils/secrets'

export interface GscOpportunity {
  query: string
  position: number
  clicks: number
  impressions: number
  ctr: number
  page: string
  score: number         
  type: 'conquest'      
      | 'defend'        
      | 'rewrite'       
}

export async function gscCredentialsAvailable(): Promise<boolean> {
  try {
    const json = await readGlobalSecret('gscServiceAccount')
    if (json && JSON.parse(json)?.client_email) return true
  } catch {
    
  }
  const keyPath = process.env.GSC_SERVICE_ACCOUNT_PATH
    ?? resolve(process.cwd(), '../secrets/gsc-service-account.json')
  return existsSync(keyPath)
}

async function createGscClient() {
  const { google } = await import('googleapis')
  const scopes = ['https://www.googleapis.com/auth/webmasters.readonly']

  
  let credentials: any = null
  try {
    const json = await readGlobalSecret('gscServiceAccount')
    if (json) credentials = JSON.parse(json)
  } catch (err: any) {
    console.warn('[gsc] Lecture DB secret échouée, fallback fichier:', err?.message)
  }

  if (credentials) {
    const auth = new google.auth.GoogleAuth({ credentials, scopes })
    return google.searchconsole({ version: 'v1', auth })
  }

  
  const keyPath = process.env.GSC_SERVICE_ACCOUNT_PATH
    ?? resolve(process.cwd(), '../secrets/gsc-service-account.json')

  if (existsSync(keyPath)) {
    const fileCreds = JSON.parse(readFileSync(keyPath, 'utf-8'))
    const auth = new google.auth.GoogleAuth({ credentials: fileCreds, scopes })
    return google.searchconsole({ version: 'v1', auth })
  }

  throw new Error('[gsc] Aucun Service Account configuré (DB row _global.secrets.gscServiceAccount absent ET fichier disque introuvable)')
}

export async function getTopOpportunities(
  siteUrl?: string,
  days = 28,
  limit = 20
): Promise<GscOpportunity[]> {
  const site = siteUrl ?? ''
  if (!site) return []

  try {
    const gsc = await createGscClient()
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    
    
    
    
    const excludeBrand = (process.env.NUXT_GSC_EXCLUDE_BRAND ?? '').trim()
    const requestBody: any = {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 500,
      startRow: 0,
    }
    if (excludeBrand) {
      requestBody.dimensionFilterGroups = [{
        filters: [{ dimension: 'query', operator: 'notContains', expression: excludeBrand }],
      }]
    }
    const response = await gsc.searchanalytics.query({ siteUrl: site, requestBody })

    const rows = response.data.rows ?? []

    const opportunities: GscOpportunity[] = rows
      .filter(r => {
        const pos = r.position ?? 0
        return pos >= 8 && pos <= 25 && (r.impressions ?? 0) >= 10
      })
      .map(r => {
        const position = Math.round(r.position ?? 0)
        const impressions = r.impressions ?? 0
        const clicks = r.clicks ?? 0
        const ctr = r.ctr ?? 0

        
        let type: GscOpportunity['type'] = 'conquest'
        if (position <= 10 && ctr < 0.02) type = 'rewrite'  
        else if (position <= 10) type = 'defend'

        return {
          query: (r.keys?.[0] ?? '').trim(),
          position,
          clicks,
          impressions,
          ctr: Math.round(ctr * 10000) / 100,
          page: (r.keys?.[1] ?? '').trim(),
          score: Math.round(impressions * (25 - position)),
          type,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    console.log(`[gsc] ${opportunities.length} opportunités trouvées (${days}j, site: ${site})`)
    return opportunities
  } catch (err: any) {
    console.warn(`[gsc] Erreur API GSC (non-bloquant):`, err?.message?.slice(0, 200))
    return []
  }
}

export async function getTotalTraffic(
  siteUrl?: string,
  days = 365,
): Promise<{ clicks: number; impressions: number; days: number }> {
  const site = siteUrl ?? ''
  if (!site) return { clicks: 0, impressions: 0, days }

  try {
    const gsc = await createGscClient()
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    const response = await gsc.searchanalytics.query({
      siteUrl: site,
      requestBody: { startDate, endDate, dimensions: [], rowLimit: 1 },
    })

    const row = response.data.rows?.[0]
    return {
      clicks: Math.round(row?.clicks ?? 0),
      impressions: Math.round(row?.impressions ?? 0),
      days,
    }
  } catch (err: any) {
    console.warn('[gsc] getTotalTraffic non-bloquant:', err?.message?.slice(0, 200))
    return { clicks: 0, impressions: 0, days }
  }
}

export async function getDecliningPages(
  siteUrl?: string,
  limit = 10
): Promise<GscOpportunity[]> {
  
  const site = siteUrl ?? ''
  if (!site) return []

  try {
    const gsc = await createGscClient()
    const now = new Date()

    const recentEnd = now.toISOString().slice(0, 10)
    const recentStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10)
    const prevEnd = recentStart
    const prevStart = new Date(now.getTime() - 28 * 86400000).toISOString().slice(0, 10)

    const [recent, previous] = await Promise.all([
      gsc.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: recentStart, endDate: recentEnd, dimensions: ['page'], rowLimit: 100 },
      }),
      gsc.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: prevStart, endDate: prevEnd, dimensions: ['page'], rowLimit: 100 },
      }),
    ])

    const prevMap = new Map<string, number>()
    for (const r of previous.data.rows ?? []) {
      prevMap.set(r.keys?.[0] ?? '', r.clicks ?? 0)
    }

    const declining = (recent.data.rows ?? [])
      .filter(r => {
        const page = r.keys?.[0] ?? ''
        const prevClicks = prevMap.get(page) ?? 0
        const currentClicks = r.clicks ?? 0
        return prevClicks > 5 && currentClicks < prevClicks * 0.7  
      })
      .map(r => ({
        query: '',
        position: Math.round(r.position ?? 0),
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: Math.round((r.ctr ?? 0) * 10000) / 100,
        page: (r.keys?.[0] ?? '').trim(),
        score: (r.impressions ?? 0),
        type: 'defend' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return declining
  } catch {
    return []
  }
}

async function _windowTotals(
  gsc: any,
  site: string,
  startDate: string,
  endDate: string,
): Promise<{ clicks: number; impressions: number; ctr: number; position: number }> {
  const response = await gsc.searchanalytics.query({
    siteUrl: site,
    requestBody: { startDate, endDate, dimensions: [], rowLimit: 1 },
  })
  const row = response.data.rows?.[0]
  return {
    clicks: Math.round(row?.clicks ?? 0),
    impressions: Math.round(row?.impressions ?? 0),
    ctr: Math.round((row?.ctr ?? 0) * 10000) / 100,
    position: Math.round((row?.position ?? 0) * 10) / 10,
  }
}

export async function getTrafficTrend(
  siteUrl?: string,
  days = 28,
): Promise<{
  days: number
  recent: { clicks: number; impressions: number; ctr: number; position: number }
  previous: { clicks: number; impressions: number; ctr: number; position: number }
  delta: { clicks_pct: number | null; impressions_pct: number | null }
}> {
  const empty = { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  const site = siteUrl ?? ''
  if (!site) return { days, recent: empty, previous: empty, delta: { clicks_pct: null, impressions_pct: null } }

  try {
    const gsc = await createGscClient()
    const now = Date.now()
    const recentEnd = new Date(now).toISOString().slice(0, 10)
    const recentStart = new Date(now - days * 86400000).toISOString().slice(0, 10)
    const prevEnd = recentStart
    const prevStart = new Date(now - 2 * days * 86400000).toISOString().slice(0, 10)

    const [recent, previous] = await Promise.all([
      _windowTotals(gsc, site, recentStart, recentEnd),
      _windowTotals(gsc, site, prevStart, prevEnd),
    ])

    const pct = (cur: number, prev: number): number | null =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null

    return {
      days,
      recent,
      previous,
      delta: { clicks_pct: pct(recent.clicks, previous.clicks), impressions_pct: pct(recent.impressions, previous.impressions) },
    }
  } catch (err: any) {
    console.warn('[gsc] getTrafficTrend non-bloquant:', err?.message?.slice(0, 200))
    return { days, recent: empty, previous: empty, delta: { clicks_pct: null, impressions_pct: null } }
  }
}

export async function getKeywordStats(
  siteUrl: string | undefined,
  keyword: string,
  days = 28,
): Promise<{
  keyword: string
  days: number
  found: boolean
  position: number
  clicks: number
  impressions: number
  ctr: number
  pages: Array<{ page: string; clicks: number; impressions: number; position: number }>
}> {
  const site = siteUrl ?? ''
  const kw = (keyword ?? '').trim()
  const base = { keyword: kw, days, found: false, position: 0, clicks: 0, impressions: 0, ctr: 0, pages: [] as any[] }
  if (!site || !kw) return base

  try {
    const gsc = await createGscClient()
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    const response = await gsc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        dimensionFilterGroups: [{
          filters: [{ dimension: 'query', operator: 'equals', expression: kw }],
        }],
        rowLimit: 25,
      },
    })

    const rows = response.data.rows ?? []
    if (rows.length === 0) return base

    let clicks = 0
    let impressions = 0
    let weightedPos = 0
    const pages = rows.map(r => {
      const c = r.clicks ?? 0
      const i = r.impressions ?? 0
      clicks += c
      impressions += i
      weightedPos += (r.position ?? 0) * i
      return {
        page: (r.keys?.[0] ?? '').trim(),
        clicks: Math.round(c),
        impressions: Math.round(i),
        position: Math.round((r.position ?? 0) * 10) / 10,
      }
    }).sort((a, b) => b.impressions - a.impressions)

    return {
      keyword: kw,
      days,
      found: true,
      position: impressions > 0 ? Math.round((weightedPos / impressions) * 10) / 10 : 0,
      clicks: Math.round(clicks),
      impressions: Math.round(impressions),
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      pages,
    }
  } catch (err: any) {
    console.warn('[gsc] getKeywordStats non-bloquant:', err?.message?.slice(0, 200))
    return base
  }
}
