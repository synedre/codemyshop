
import { errorMessage } from '~/server/utils/redact-url-secrets'

interface IgMediaRaw {
  id:              string
  caption?:        string
  media_type:      'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?:      string
  thumbnail_url?:  string
  permalink:       string
  timestamp:       string
}

interface IgMedia {
  id:          string
  caption:     string
  mediaType:   IgMediaRaw['media_type']
  imageUrl:    string
  permalink:   string
  timestamp:   string
}

const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'

async function igDbFallback(event: any, n: number): Promise<{ items: IgMedia[] }> {
  try {
    const db = useClientDb(event)
    const rows = await db.query<{
      ig_id: string; media_type: string; image_url: string | null
      thumbnail_url: string | null; local_path: string | null
      permalink: string | null; posted_at: string | Date
    }>(
      `SELECT ig_id, media_type, image_url, thumbnail_url, local_path, permalink, posted_at
         FROM cs_main.cs_instagram_post
        WHERE active = 1
        ORDER BY posted_at DESC
        LIMIT ?`,
      [n],
    )
    const items: IgMedia[] = rows.map(r => ({
      id:        String(r.ig_id),
      caption:   '',
      mediaType: (r.media_type as IgMediaRaw['media_type']) || 'IMAGE',
      imageUrl:  r.local_path || r.thumbnail_url || r.image_url || '',
      permalink: r.permalink || '',
      timestamp: typeof r.posted_at === 'string' ? r.posted_at : new Date(r.posted_at).toISOString(),
    })).filter(m => m.imageUrl)
    return { items }
  } catch (err: any) {
    console.warn('[instagram/feed] DB fallback error:', errorMessage(err))
    return { items: [] }
  }
}

export default defineCachedEventHandler(async (event): Promise<{ items: IgMedia[] }> => {
  const cfg = useRuntimeConfig(event)
  const token = String(cfg.instagramToken || '')
  const igUserId = String(cfg.instagramIgUserId || '')

  const { limit } = getQuery(event)
  const n = Math.min(Math.max(Number(limit) || 6, 1), 12)

  if (!token) {
    return igDbFallback(event, n)
  }

  
  
  
  const isInstagramLoginToken = token.startsWith('IGAA')
  const url = (!isInstagramLoginToken && igUserId)
    ? `https://graph.facebook.com/v19.0/${igUserId}/media`
      + `?fields=${FIELDS}&limit=${n}&access_token=${encodeURIComponent(token)}`
    : `https://graph.instagram.com/me/media`
      + `?fields=${FIELDS}&limit=${n}&access_token=${encodeURIComponent(token)}`

  try {
    const res = await $fetch<{ data?: IgMediaRaw[] }>(url)
    const items: IgMedia[] = (res?.data ?? []).map(m => ({
      id:        m.id,
      caption:   m.caption ?? '',
      mediaType: m.media_type,
      imageUrl:  m.media_type === 'VIDEO' ? (m.thumbnail_url ?? '') : (m.media_url ?? ''),
      permalink: m.permalink,
      timestamp: m.timestamp,
    })).filter(m => m.imageUrl)

    return { items }
  } catch (err: any) {
    console.warn('[instagram/feed] Graph API error → fallback DB:', errorMessage(err))
    return igDbFallback(event, n)
  }
}, {
  maxAge: 60 * 60,       
  name:   'instagram-feed',
  getKey: (event) => `ig-${getQuery(event).limit || 6}`,
})
