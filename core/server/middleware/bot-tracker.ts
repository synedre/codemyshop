

import { detectBot } from '~/server/utils/bot-detect'

interface BotHit {
  bot: string
  url: string
  status: number
  ip: string
}

const MAX_BUFFER = 500
let buffer: BotHit[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

let disabled = false

function stopTracking(reason: string) {
  disabled = true
  buffer = []
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  console.warn(`[bot-tracker] disabled — ${reason}`)
}

async function flushBuffer() {
  if (disabled || buffer.length === 0) return
  const toFlush = buffer.slice(0, MAX_BUFFER)
  buffer = buffer.slice(toFlush.length)

  try {
    const { insertBotHits, purgeOldBotHits } = await import('~/enterprise/data/telemetry/server/utils/telemetry')
    await insertBotHits(toFlush, {})
    await purgeOldBotHits(30, {})
  } catch (err: any) {
    
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      stopTracking(`table cs_bot_hits missing (install module ac_telemetry)`)
      return
    }
    
    console.error(`[bot-tracker] flush error (${toFlush.length} hits dropped):`, err?.code || err?.message || 'unknown')
  }
}

export default defineEventHandler((event) => {
  if (disabled) return

  const ua = getRequestHeader(event, 'user-agent') || ''
  const bot = detectBot(ua)
  if (!bot) return 

  const url = getRequestURL(event).pathname
  const ip = getRequestHeader(event, 'x-real-ip')
    || getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || ''

  
  if (url.startsWith('/_nuxt/') || url.startsWith('/img/') || url.includes('.')) return

  
  event.node.res.on('finish', () => {
    if (disabled || buffer.length >= MAX_BUFFER) return
    buffer.push({
      bot,
      url,
      status: event.node.res.statusCode,
      ip,
    })
  })

  
  if (!flushTimer) {
    flushTimer = setInterval(flushBuffer, 30000)
    process.on('beforeExit', flushBuffer)
  }
})
