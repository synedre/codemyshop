

import { useClientDb } from '~/server/utils/db'
import { isMissingTable } from '~/server/utils/missing-table'
import { listActiveReviewsForClient } from '~/internal/hub/server/utils/hub'

export interface Review {
  author:  string
  company: string
  rating:  number
  title:   string
  text:    string
  date:    string
  source:  string
}

export interface BusinessMeta {
  name:           string
  url:            string
  gmaps_url:      string | null
  total_rating:   number | null
  total_reviews:  number | null
}

interface ReviewRow {
  author: string
  company: string
  rating: number
  title: string | null
  body: string
  
  title_i18n?: string | null
  body_i18n?: string | null
  review_date: string | Date
  source: string
}

interface BusinessRow {
  name: string
  url: string
  gmaps_url: string | null
  total_rating: number | null
  total_reviews: number | null
}

function extractTitle(text: string): string {
  const sentence = text.split(/[.!?\n]/)[0]?.trim() ?? ''
  return sentence.length > 80 ? sentence.slice(0, 77) + '…' : sentence
}

function reviewsSql(i18nLang: string | null): string {
  const i18nCols = i18nLang
    ? `, title_${i18nLang} AS title_i18n, body_${i18nLang} AS body_i18n`
    : ''
  return `SELECT author, company, rating, title, body${i18nCols}, review_date, source
         FROM cs_main.cs_reviews
        WHERE active = 1
        ORDER BY review_date DESC`
}

function isUndefinedColumn(err: any): boolean {
  return err?.code === '42703'
      || err?.errno === 1054
      || /does not exist|Unknown column/i.test(String(err?.message ?? ''))
}

export default defineEventHandler(async (event) => {
  const { limit = '6', offset = '0', lang } = getQuery(event)
  
  
  
  const langParam = String(lang || '').toLowerCase()
  const i18nLang  = langParam === 'en' || langParam === 'de' ? langParam : null
  const db = useClientDb(event)

  let reviews: Review[] = []
  let business: BusinessMeta | null = null

  
  
  
  try {
    let tenantRows: ReviewRow[]
    try {
      tenantRows = await db.query<ReviewRow>(reviewsSql(i18nLang))
    } catch (colErr: any) {
      
      
      if (!i18nLang || !isUndefinedColumn(colErr)) throw colErr
      tenantRows = await db.query<ReviewRow>(reviewsSql(null))
    }
    if (tenantRows.length > 0) {
      reviews = tenantRows.map(r => {
        const title = r.title_i18n ?? r.title
        const body  = r.body_i18n  ?? r.body
        return {
        author:  r.author,
        company: r.company,
        rating:  Number(r.rating),
        title:   title || extractTitle(body),
        text:    body,
        date:    typeof r.review_date === 'string'
                   ? r.review_date
                   : new Date(r.review_date).toISOString().split('T')[0],
        source:  r.source,
        }
      })
    } else {
      
      const rows = await listActiveReviewsForClient({ event })
      reviews = rows.map(r => ({
        author:  r.author,
        company: r.company,
        rating:  Number(r.rating),
        title:   r.title || extractTitle(r.body),
        text:    r.body,
        date:    typeof r.review_date === 'string'
                   ? r.review_date
                   : new Date(r.review_date).toISOString().split('T')[0],
        source:  r.source,
      }))
    }
  } catch (err: any) {
    if (!isMissingTable(err)) {
      console.error('[reviews] DB error:', err?.message)
    }
    
  }

  
  
  
  
  
  
  
  try {
    const rows = await db.query<BusinessRow>(
      `SELECT name, url, gmaps_url, total_rating, total_reviews
         FROM cs_business
        WHERE active = 1`,
    )
    if (rows.length > 0) {
      const dominant = [...rows].sort(
        (a, b) => (Number(b.total_reviews) || 0) - (Number(a.total_reviews) || 0),
      )[0]
      const totalReviews = rows.reduce((s, r) => s + (Number(r.total_reviews) || 0), 0)
      const weighted = rows.reduce(
        (s, r) => s + (Number(r.total_rating) || 0) * (Number(r.total_reviews) || 0), 0,
      )
      const rating = totalReviews > 0
        ? Math.round((weighted / totalReviews) * 10) / 10
        : (dominant.total_rating !== null ? Number(dominant.total_rating) : null)
      business = {
        name:          dominant.name,
        url:           dominant.url,
        gmaps_url:     dominant.gmaps_url,
        total_rating:  rating,
        total_reviews: totalReviews > 0 ? totalReviews : null,
      }
    }
  } catch (err: any) {
    if (!isMissingTable(err)) {
      console.error('[reviews] business meta error:', err?.message)
    }
  }

  const start = Number(offset)
  const end   = limit === 'all' ? reviews.length : start + Number(limit)

  return {
    reviews: reviews.slice(start, end),
    total:   reviews.length,
    business,
  }
})
