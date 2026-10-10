

import { rateLimit } from '../utils/redis'
import { loadCategoryRootSlugs } from '../utils/category-roots'

const BUCKETS: Array<{ name: string; match: RegExp; max: number; windowSec: number }> = [
  
  
  
  
  
  
  
  { name: 'auth',      match: /^\/api\/auth\/(login|register|password-reset|forgot-password)$/, max: 10, windowSec: 60 },
  
  
  
  
  { name: 'contact',   match: /^\/api\/(contact|blog\/contact|email-verify|siret-verify)$/, max: 20, windowSec: 60 },
  
  
  { name: 'forum-write', match: /^\/api\/forum\/(topic|post)$/, max: 10, windowSec: 60 },
  
  { name: 'catalogue', match: /^\/api\/catalogue\//,    max: 60,  windowSec: 60 },  
  
  { name: 'stores',    match: /^\/api\/stores(\/|$|\?)/,max: 30,  windowSec: 60 },
  
  { name: 'product',   match: /^\/api\/product-/,        max: 60, windowSec: 60 },
  
  { name: 'api',       match: /^\/api\//,                max: 120, windowSec: 60 },  
  
  
  
  { name: 'page',      match: /^\/produit\//, max: 90, windowSec: 60 },
]
const PAGE_BUCKET = BUCKETS.find((b) => b.name === 'page')!

async function isCategoryPage(path: string): Promise<boolean> {
  const m = /^\/([^/]+)\/./.exec(path)
  if (!m) return false
  return (await loadCategoryRootSlugs()).has(m[1])
}

const WHITELIST_UA = /(Googlebot|Bingbot|DuckDuckBot|YandexBot|Applebot|Slurp|Twitterbot|facebookexternalhit|LinkedInBot|WhatsApp|TelegramBot|PinterestBot|SemrushBot|AhrefsBot)/i

const BLACKLIST_UA = /(scrapy|httrack|nikto|nuclei|sqlmap|gobuster|dirbuster)/i

const SKIP_PATHS = /^\/(_nuxt|_ipx|_fonts|__sitemap|favicon|robots\.txt|sitemap|img\/|fonts\/|api\/translations|api\/hub\/translations|api\/category|api\/catalogue\/|api\/product-|api\/footer-config)/

function getClientIp(event: any): string {
  const xreal = getHeader(event, 'x-real-ip')
  if (xreal) return String(xreal).trim()          
  const xff = getHeader(event, 'x-forwarded-for')
  if (xff) return String(xff).split(',')[0].trim() 
  return 'loopback'                                
}

export default defineEventHandler(async (event) => {
  
  const url = getRequestURL(event)
  const path = url.pathname
  if (SKIP_PATHS.test(path)) return

  
  const cfg = useRuntimeConfig(event) as any
  if (cfg.disableRateLimit === true || cfg.public?.disableRateLimit === true) return

  
  const bucket = BUCKETS.find((b) => b.match.test(path))
    ?? (await isCategoryPage(path) ? PAGE_BUCKET : undefined)
  if (!bucket) return  

  
  const ua = String(getHeader(event, 'user-agent') || '')
  if (WHITELIST_UA.test(ua)) return

  
  if (BLACKLIST_UA.test(ua)) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', '3600')
    setResponseHeader(event, 'X-RateLimit-Reason', 'blacklisted-ua')
    return { error: 'Too Many Requests', reason: 'Automated access detected' }
  }

  
  
  
  
  
  const ip = getClientIp(event)
  if (ip === 'loopback') return
  const key = `${bucket.name}:${ip}`
  const allowed = await rateLimit(key, bucket.max, bucket.windowSec)

  if (!allowed) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', String(bucket.windowSec))
    setResponseHeader(event, 'X-RateLimit-Bucket', bucket.name)
    setResponseHeader(event, 'X-RateLimit-Limit', String(bucket.max))
    setResponseHeader(event, 'X-RateLimit-Window', String(bucket.windowSec))
    return { error: 'Too Many Requests', bucket: bucket.name, retryAfter: bucket.windowSec }
  }

  
  setResponseHeader(event, 'X-RateLimit-Bucket', bucket.name)
  setResponseHeader(event, 'X-RateLimit-Limit', String(bucket.max))
})
