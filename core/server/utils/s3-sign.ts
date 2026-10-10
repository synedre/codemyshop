

import { createHash, createHmac } from 'node:crypto'

export interface S3Creds {
  accessKey: string
  secretKey: string
  region: string
  endpoint: string  
  bucket: string
}

const SERVICE = 's3'
const ALGO = 'AWS4-HMAC-SHA256'

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function hmacHex(key: string | Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  const kDate    = hmac('AWS4' + secret, dateStamp)
  const kRegion  = hmac(kDate, region)
  const kService = hmac(kRegion, SERVICE)
  return hmac(kService, 'aws4_request')
}

function nowStamps(): { iso: string; date: string } {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
  const iso = `${date}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  return { iso, date }
}

function uriEncode(str: string, preserveSlash = false): string {
  const enc = encodeURIComponent(str).replace(
    /[!'()*]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
  return preserveSlash ? enc.replace(/%2F/g, '/') : enc
}

export function signS3GetRequest(
  creds: S3Creds,
  path: string,
  query: Record<string, string> = {},
): { url: string; headers: Record<string, string> } {
  const { iso, date } = nowStamps()
  const host = new URL(creds.endpoint).host

  
  const canonicalUri = '/' + uriEncode(creds.bucket, true) +
    (path ? '/' + uriEncode(path, true) : '/')

  const qsPairs = Object.keys(query).sort().map(
    k => `${uriEncode(k)}=${uriEncode(query[k])}`,
  )
  const canonicalQs = qsPairs.join('&')

  const payloadHash = sha256('')
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${iso}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQs,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${date}/${creds.region}/${SERVICE}/aws4_request`
  const stringToSign = [ALGO, iso, scope, sha256(canonicalRequest)].join('\n')
  const key = signingKey(creds.secretKey, date, creds.region)
  const signature = hmacHex(key, stringToSign)

  const auth = `${ALGO} Credential=${creds.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const url = `${creds.endpoint}${canonicalUri}${canonicalQs ? '?' + canonicalQs : ''}`
  return {
    url,
    headers: {
      'host': host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': iso,
      'authorization': auth,
    },
  }
}

export function presignS3GetUrl(
  creds: S3Creds,
  path: string,
  expiresIn = 300,
): string {
  const { iso, date } = nowStamps()
  const host = new URL(creds.endpoint).host

  const canonicalUri = '/' + uriEncode(creds.bucket, true) + '/' + uriEncode(path, true)
  const scope = `${date}/${creds.region}/${SERVICE}/aws4_request`

  
  const query: Record<string, string> = {
    'X-Amz-Algorithm':     ALGO,
    'X-Amz-Credential':    `${creds.accessKey}/${scope}`,
    'X-Amz-Date':          iso,
    'X-Amz-Expires':       String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  }
  const qsPairs = Object.keys(query).sort().map(
    k => `${uriEncode(k)}=${uriEncode(query[k])}`,
  )
  const canonicalQs = qsPairs.join('&')

  
  
  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = 'host'
  const payloadHash = 'UNSIGNED-PAYLOAD'

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQs,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [ALGO, iso, scope, sha256(canonicalRequest)].join('\n')
  const key = signingKey(creds.secretKey, date, creds.region)
  const signature = hmacHex(key, stringToSign)

  return `${creds.endpoint}${canonicalUri}?${canonicalQs}&X-Amz-Signature=${signature}`
}

export async function putS3Object(
  creds: S3Creds,
  key: string,
  body: Buffer,
  contentType: string,
  extraHeaders: Record<string, string> = {},
): Promise<void> {
  const { iso, date } = nowStamps()
  const host = new URL(creds.endpoint).host
  const canonicalUri = '/' + uriEncode(creds.bucket, true) + '/' + uriEncode(key, true)
  const payloadHash = sha256(body)

  
  const hdrs: Record<string, string> = {
    'cache-control': 'public, max-age=31536000, immutable',
    'content-type': contentType,
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': iso,
    ...Object.fromEntries(Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])),
  }
  const signedNames = Object.keys(hdrs).sort()
  const canonicalHeaders = signedNames.map(n => `${n}:${hdrs[n]}\n`).join('')
  const signedHeaders = signedNames.join(';')

  const canonicalRequest = [
    'PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n')

  const scope = `${date}/${creds.region}/${SERVICE}/aws4_request`
  const stringToSign = [ALGO, iso, scope, sha256(canonicalRequest)].join('\n')
  const key4 = signingKey(creds.secretKey, date, creds.region)
  const signature = hmacHex(key4, stringToSign)
  const auth = `${ALGO} Credential=${creds.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const url = `${creds.endpoint}${canonicalUri}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...hdrs, authorization: auth } as Record<string, string>,
    body,
  })
  if (!res.ok) {
    throw new Error(`S3 PUT ${key} failed (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
}

export interface S3Object {
  key: string
  size: number
  lastModified: string
}

export async function listS3Objects(
  creds: S3Creds,
  prefix: string,
): Promise<S3Object[]> {
  const { url, headers } = signS3GetRequest(creds, '', {
    'list-type': '2',
    prefix,
  })
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`S3 list failed (${res.status}): ${await res.text()}`)
  }
  const xml = await res.text()

  const objects: S3Object[] = []
  
  const contentsRe = /<Contents>([\s\S]*?)<\/Contents>/g
  const keyRe      = /<Key>([^<]+)<\/Key>/
  const sizeRe     = /<Size>(\d+)<\/Size>/
  const modRe      = /<LastModified>([^<]+)<\/LastModified>/

  for (const m of xml.matchAll(contentsRe)) {
    const block = m[1]
    const key  = keyRe.exec(block)?.[1]
    const size = sizeRe.exec(block)?.[1]
    const mod  = modRe.exec(block)?.[1]
    if (key && size && mod) {
      objects.push({ key, size: parseInt(size, 10), lastModified: mod })
    }
  }
  return objects
}

export function scwCredsFromEnv(): S3Creds | null {
  const e = process.env
  const accessKey = (e.NUXT_SCW_ACCESS_KEY || e.SCW_ACCESS_KEY || '').trim()
  const secretKey = (e.NUXT_SCW_SECRET_KEY || e.SCW_SECRET_KEY || '').trim()
  const endpoint = (e.NUXT_SCW_ENDPOINT || e.SCW_ENDPOINT || '').trim()
  const bucket = (e.NUXT_SCW_BUCKET || e.SCW_BUCKET || '').trim()
  const region = (e.NUXT_SCW_REGION || e.SCW_REGION || 'fr-par').trim()
  if (!accessKey || !secretKey || !endpoint || !bucket) return null
  return { accessKey, secretKey, region, endpoint, bucket }
}
