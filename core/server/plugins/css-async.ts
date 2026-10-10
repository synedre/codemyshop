

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FastBeasties } from '../utils/critical-css-fast'
import { beastiesDocument, beastiesOptions, fontFacesHead, parseFontFaces, resolvePublicPath, type ParsedFontFace } from '../utils/critical-css'

const resolved = resolvePublicPath(
  [process.env.pm_exec_path, process.argv[1]],
  process.cwd(),
  existsSync,
)
const publicPath = resolved ?? resolve(process.cwd(), '.output/public')

if (!resolved) {
  console.error('[css-async] aucun dossier public de build trouvé (script',
    process.env.pm_exec_path || process.argv[1], ', cwd', process.cwd(),
    ') : CSS critique INACTIF, feuilles servies en bloquant.')
} else if (process.env.CSS_ASYNC_VERBOSE === 'true') {
  console.log('[css-async] plugin loaded, publicPath =', publicPath)
}

const beasties = new FastBeasties(beastiesOptions(publicPath))

const facesByHref = new Map<string, ParsedFontFace[]>()
function facesOf(href: string): ParsedFontFace[] {
  let faces = facesByHref.get(href)
  if (!faces) {
    try {
      faces = parseFontFaces(readFileSync(resolve(publicPath, href.slice(1)), 'utf8'), href)
    } catch {
      faces = []
    }
    facesByHref.set(href, faces)
  }
  return faces
}

let missingWarned = false
function warnMissingSheets(head: string) {
  if (missingWarned || !resolved) return
  for (const [, href] of head.matchAll(/<link[^>]+href="(\/_nuxt\/[\w.-]+\.css)"/g)) {
    if (!existsSync(resolve(publicPath, href.slice(1)))) {
      missingWarned = true
      console.warn('[css-async] feuille', href, 'introuvable sous', publicPath, ': CSS critique non extrait.')
      return
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (htmlContext, { event }) => {
    const url = event?.path || ''
    if (url.startsWith('/hub') || !resolved) return

    
    
    warnMissingSheets(htmlContext.head.join(''))

    
    const html = beastiesDocument(htmlContext)

    let processed: string
    try {
      processed = await beasties.process(html)
    } catch (err) {
      console.error('[css-async] beasties.process failed:', (err as Error).message)
      return
    }

    
    const headMatch = processed.match(/<head>([\s\S]*?)<\/head>/)
    if (headMatch) {
      
      const hrefs = new Set(
        [...html.matchAll(/<link[^>]+href="(\/_nuxt\/[\w.-]+\.css)"/g)].map(m => m[1]),
      )
      let head = headMatch[1]
      const pageCss = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('')
      const fonts = fontFacesHead([...hrefs].flatMap(facesOf), pageCss)
      if (fonts) {
        const at = head.indexOf('<style')
        head = at === -1 ? head + fonts : head.slice(0, at) + fonts + head.slice(at)
      }
      htmlContext.head = [head]
    }
    
    
    
  })
})
