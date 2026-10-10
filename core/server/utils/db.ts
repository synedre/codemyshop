

import { isDomainOnPg } from './pg-flag'
import { buildPgAdapter, type PgAdapterClient } from './db-pg-adapter'

function buildClientDbMap(): Record<string, { database: string; host?: string; port?: number; user?: string; password?: string }> {
  const map: Record<string, { database: string; host?: string; port?: number; user?: string; password?: string }> = {}
  const PREFIX = 'NUXT_TENANT_DB_'

  for (const [key, val] of Object.entries(process.env)) {
    if (!key.startsWith(PREFIX) || !val) continue
    const clientKey = key.slice(PREFIX.length).toLowerCase().replace(/_/g, '-')
    const parts = val.split(',')
    map[clientKey] = {
      database: parts[0],
      host: parts[1] || undefined,
      port: parts[2] ? Number(parts[2]) : undefined,
      user: parts[3] || undefined,
      password: parts[4] || undefined,
    }
  }

  return map
}

const CLIENT_DB_MAP = buildClientDbMap()

const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID || 'codemyshop'

export function getKnownTenantClientIds(): string[] {
  return Object.keys(CLIENT_DB_MAP)
}

export function resolveClientId(event?: any): string {
  
  try {
    const cfg = useRuntimeConfig(event)
    const fromCfg = (cfg.clientId as string | undefined) || ''
    if (fromCfg && fromCfg !== DEFAULT_CLIENT_ID) return fromCfg
  } catch {  }

  
  if (event) {
    try {
      const host = getRequestHost(event) || ''
      for (const clientKey of Object.keys(CLIENT_DB_MAP)) {
        const keyword = clientKey.replace(/-v\d+$/, '').replace(/-/g, '')
        if (host.includes(keyword)) return clientKey
      }
    } catch {  }
  }

  return DEFAULT_CLIENT_ID
}

function getPrimaryPgTenants(): Set<string> {
  const raw = process.env.PG_PRIMARY_TENANTS || ''
  const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return new Set(parsed.length ? parsed : [DEFAULT_CLIENT_ID])
}

const PRIMARY_PG_TENANTS = getPrimaryPgTenants()

function getExtraPgTenants(): Set<string> {
  const raw = process.env.PG_ENABLED_TENANTS || ''
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

function shouldDispatchToPg(clientId: string): boolean {
  if (!isDomainOnPg('*')) return false
  return PRIMARY_PG_TENANTS.has(clientId) || getExtraPgTenants().has(clientId)
}

export function useClientDbById(clientId: string): PgAdapterClient {
  if (shouldDispatchToPg(clientId)) return buildPgAdapter(clientId)
  throw new Error(
    `[db] useClientDbById('${clientId}') : path mysql2 droppé (migration). `
    + `Tenant non primary ou PG_ENABLED_DOMAINS non wildcard. `
    + `Migrer ce tenant vers PG avant son prochain deploy.`,
  )
}

export function useClientDb(event?: any): PgAdapterClient {
  const clientId = resolveClientId(event)
  return useClientDbById(clientId)
}
