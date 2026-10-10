

import {
  pickPendingItem,
  pickUnpublishedDoneItem,
  markProcessing,
  markPublished,
  readCadenceCounters,
  storeResult,
  storeCoverScene,
  storeProvider,
  storeQualityScore,
  holdForQualityReview,
  isQualityApproved,
  isCoverGenerated,
  holdForVisuals,
  languesEnAttenteDeVisuels,
  markError,
} from '~/enterprise/ai/cms-queue/server/utils/cms-queue'
import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'
import { familleDuModele, readLlmConfigByProvider, tenantServedFamilies, type LlmProvider, type RedactionFamily } from '~/server/utils/llm-config'
import { useClientDb, resolveClientId } from '~/server/utils/db'
import { costUsd } from '~/utils/llm-pricing'
import { firstTextBlock } from '~/utils/llm-response-block'
import { stripUnverifiedAttributions, auditCitations, stripUnlistedExternalLinks, extractFactUrls, type CitedSource } from '~/utils/citation-guard'
import { loadValidSources } from '~/server/utils/article-source'
import { loadBrandBrief } from '~/server/utils/brand-brief'
import { stripTrailingFaqSection } from '~/server/utils/blog-content'
import { bornerFaqBlog } from '~/server/utils/blog-faq'
import { requireCronCaller } from '~/server/utils/cron-auth'
import { publishRedactionToArticle } from '~/server/utils/article-publish'
import { resumeNote, type QualityReport } from '~/server/utils/blog-quality-score'
import { noterRedaction, type TexteANoter } from '~/server/utils/redaction-quality'
import { extractCoverScene } from '~/server/utils/cover-scene-prompt'
import { extraireVisuels, type VisuelsExtraits } from '~/server/utils/article-visual-contract'
import { loadSlotsRegles, slotsAttendus, storeVisualBriefs, visuelsAuComplet } from '~/server/utils/article-visual'
import { buildRedactionPrompt, loadRedactionContext } from '~/server/utils/redaction-prompt'
import { describeCadence, loadCadenceSettings, perLanguageCadence } from '~/server/utils/blog-cadence'
import { loadBlogLinkCatalog, type BlogLinkCatalog } from '~/server/utils/blog-linkcatalog'
import {
  applyBlogMesh,
  assertNoDeadInternalLinks,
  assertMeshQuota,
  promptLinkCatalog,
} from '~/server/utils/blog-linkguard'
import { readShopConfigValue } from '~/server/utils/shop-config'
import { tronqueSurUnMot } from '~/utils/titre-tronque'

type QueueItem = Awaited<ReturnType<typeof pickPendingItem>> extends infer T
  ? T extends null ? never : T
  : never

interface LlmResponse {
  content_html: string
  meta_title: string
  meta_description: string
  optimized_slug: string
  faq_json: string
  word_count: number
  faq_count: number
  

  cover_scene: string | null
  

  visuels?: VisuelsExtraits | null
}

async function jugerAvantPublication(
  event: any,
  db: ReturnType<typeof useClientDb>,
  job: { id_redaction: number; id_cms: number; id_lang?: number; title: string; slug: string | null },
  texte: TexteANoter,
  catalog: BlogLinkCatalog | null,
  opts: { bloquant: boolean },
): Promise<{ retenir: boolean; approuve: boolean; note: QualityReport }> {
  const note = await noterRedaction(db, job, texte, catalog, await isCoverGenerated(job.id_cms, { event }))
  const approuve = !note.passe && await isQualityApproved(job.id_redaction, { event })
  const retenir = opts.bloquant && !note.passe && !approuve
  if (retenir) {
    console.warn(`[redaction #${job.id_redaction}] retenu en relecture — ${resumeNote(note)}`)
    await holdForQualityReview(job.id_redaction, note, { event })
  } else {
    if (!note.passe) console.warn(`[redaction #${job.id_redaction}] publié sous le seuil (${approuve ? 'validé à la main' : 'mode mcp'}) — ${resumeNote(note)}`)
    await storeQualityScore(job.id_redaction, note, { event })
  }
  return { retenir, approuve, note }
}

async function porteVisuelsArmee(db: ReturnType<typeof useClientDb>): Promise<boolean> {
  try {
    return (await readShopConfigValue(db, 'AC_BLOG_VISUALS_GATE')).trim() === '1'
  } catch {
    return false
  }
}

async function attendreVisuels(
  event: any,
  db: ReturnType<typeof useClientDb>,
  job: { id_redaction: number; id_cms: number; id_lang?: number | null; source?: string | null },
  armee: boolean,
): Promise<boolean> {
  if (!armee || job.source === 'mcp') return false
  const presents = await loadSlotsRegles(db, job.id_cms, job.id_lang || 1)
  if (visuelsAuComplet(presents)) return false
  const manquants = slotsAttendus()
    .filter((a) => !presents.some((v) => v.kind === a.kind && v.slot === a.slot))
    .map((a) => `${a.kind} ${a.slot}`)
    .join(', ')
  console.warn(`[redaction #${job.id_redaction}] retenu en attente de visuels — manquent : ${manquants}`)
  await holdForVisuals(job.id_redaction, `manquent : ${manquants}`, { event })
  return true
}

const MAX_OUTPUT_TOKENS = 16000

interface LlmCall {
  text: string
  tokensIn: number | null
  tokensOut: number | null
  

  truncated: boolean
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<LlmCall> {
  const modelId = model === 'gemini-2.5-flash' ? 'gemini-2.5-flash-preview-05-20' : model
  const res = await $fetch<any>(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
    method: 'POST',
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
    },
    timeout: 120000,
  })
  return {
    text: res?.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokensIn: res?.usageMetadata?.promptTokenCount ?? null,
    tokensOut: res?.usageMetadata?.candidatesTokenCount ?? null,
    truncated: res?.candidates?.[0]?.finishReason === 'MAX_TOKENS',
  }
}

async function callClaude(prompt: string, apiKey: string, model: string): Promise<LlmCall> {
  const modelId = model === 'claude-sonnet-4' ? 'claude-sonnet-4-20250514' : model
  const res = await $fetch<any>('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: {
      model: modelId,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    },
    timeout: 120000,
  })
  
  
  
  return {
    text: firstTextBlock(res?.content),
    tokensIn: res?.usage?.input_tokens ?? null,
    tokensOut: res?.usage?.output_tokens ?? null,
    truncated: res?.stop_reason === 'max_tokens',
  }
}

async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<LlmCall> {
  const modelId = model === 'gpt-4o' ? 'gpt-4o' : model
  const res = await $fetch<any>('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
    },
    timeout: 120000,
  })
  return {
    text: res?.choices?.[0]?.message?.content || '',
    tokensIn: res?.usage?.prompt_tokens ?? null,
    tokensOut: res?.usage?.completion_tokens ?? null,
    truncated: res?.choices?.[0]?.finish_reason === 'length',
  }
}

function parseResponse(raw: string): LlmResponse {
  
  
  
  
  
  const contentMatch = raw.match(/---CONTENT---\s*\n([\s\S]*?)(?=---META_TITLE---|---SLUG---|---FAQ_JSON---|---COVER_SCENE---|---INFOGRAPHIE---|---PHOTOS_CORPS---|$)/i)
  const titleMatch = raw.match(/---META_TITLE---\s*\n([\s\S]*?)(?=---META_DESCRIPTION---|---SLUG---|---FAQ_JSON---|---COVER_SCENE---|---INFOGRAPHIE---|---PHOTOS_CORPS---|$)/i)
  const descMatch = raw.match(/---META_DESCRIPTION---\s*\n([\s\S]*?)(?=---SLUG---|---FAQ_JSON---|---COVER_SCENE---|---INFOGRAPHIE---|---PHOTOS_CORPS---|$)/i)
  const slugMatch = raw.match(/---SLUG---\s*\n([\s\S]*?)(?=---FAQ_JSON---|---COVER_SCENE---|---INFOGRAPHIE---|---PHOTOS_CORPS---|$)/i)
  const faqMatch = raw.match(/---FAQ_JSON---\s*\n([\s\S]*?)(?=---COVER_SCENE---|---INFOGRAPHIE---|---PHOTOS_CORPS---|$)/i)

  let html = contentMatch ? contentMatch[1].trim() : raw.trim()
  html = html.replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')
  
  
  html = stripTrailingFaqSection(html)

  const metaTitle = titleMatch ? titleMatch[1].trim() : ''
  const metaDesc = descMatch ? descMatch[1].trim() : ''
  const slug = slugMatch ? slugMatch[1].trim() : ''

  let faqJson = '[]'
  let faqCount = 0
  if (faqMatch) {
    const faqRaw = faqMatch[1].trim().replace(/^```json?\s*\n?/, '').replace(/\n?```\s*$/, '')
    try {
      const parsed = JSON.parse(faqRaw)
      if (Array.isArray(parsed)) {
        
        
        const bornee = bornerFaqBlog(parsed)
        faqJson = JSON.stringify(bornee)
        faqCount = bornee.length
      }
    } catch {  }
  }

  const plain = html.replace(/<[^>]+>/g, ' ')
  const wordCount = plain.split(/\s+/).filter(Boolean).length

  
  const coverScene = extractCoverScene(raw)

  
  
  const visuels = extraireVisuels(raw, html)

  return { content_html: html, meta_title: metaTitle, meta_description: metaDesc, optimized_slug: slug, faq_json: faqJson, word_count: wordCount, faq_count: faqCount, cover_scene: coverScene, visuels }
}

function getProvider(model: string): RedactionFamily {
  return familleDuModele(model)
}

function toLlmProvider(p: RedactionFamily): LlmProvider {
  return p === 'anthropic' ? 'claude' : (p as LlmProvider)
}

function buildProvidedResult(
  providedHtml: string,
  item: QueueItem,
): LlmResponse {
  
  const dtCount = (providedHtml.match(/<dt>/gi) || []).length
  const hasFaqDiv = /class="[^"]*faq-section[^"]*"/i.test(providedHtml)
  const h3Count = hasFaqDiv ? (providedHtml.match(/<h3>/gi) || []).length : 0
  let faqCount = Math.max(dtCount, h3Count)

  
  let faqJson = '[]'
  if (dtCount > 0) {
    const pairs: Array<{ q: string; a: string }> = []
    const dtRe = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi
    let m: RegExpExecArray | null
    
    while ((m = dtRe.exec(providedHtml)) !== null) {
      pairs.push({
        q: m[1].replace(/<[^>]+>/g, '').trim(),
        a: m[2].replace(/<[^>]+>/g, '').trim(),
      })
    }
    if (pairs.length) {
      const bornee = bornerFaqBlog(pairs)
      faqJson = JSON.stringify(bornee)
      faqCount = bornee.length
    }
  }

  
  const contentHtml = stripTrailingFaqSection(providedHtml)

  
  const plain = contentHtml.replace(/<[^>]+>/g, ' ')
  const wordCount = plain.split(/\s+/).filter(Boolean).length

  return {
    content_html: contentHtml,
    
    
    
    
    
    meta_title: tronqueSurUnMot(item.meta_title?.trim() || item.title, 60),
    meta_description: item.meta_description || '',
    optimized_slug: item.slug,
    faq_json: faqJson,
    word_count: wordCount,
    faq_count: faqCount,
    
    
    
    cover_scene: null,
  }
}

export default defineEventHandler(async (event) => {
  
  
  requireCronCaller(event)

  
  
  
  
  
  
  
  
  const cadenceDb = useClientDb(event)
  const cadence = await loadCadenceSettings((key) => readShopConfigValue(cadenceDb, key))
  const compteurs = await readCadenceCounters(cadence.timezone, { event })
  
  
  const { verdict: porte, excludeLangs } = perLanguageCadence({
    perDay: cadence.perDay,
    publishedByLang: compteurs.publishedByLang,
    nowMinutes: compteurs.nowMinutes,
    window: cadence.window,
    days: cadence.days,
    isoWeekday: compteurs.isoWeekday,
  })
  const cadenceMsg = describeCadence(porte, cadence)
  
  
  
  
  const onlyMcp = !porte.open

  
  
  
  
  
  
  
  
  
  const servedFamilies = await tenantServedFamilies(
    cadenceDb,
    await getClientConfigJson(resolveClientId(event), { event }).catch(() => null),
  )
  const onlyProvided = servedFamilies.length === 0

  
  
  
  const visuelsArmee = await porteVisuelsArmee(cadenceDb)
  const visuelsAttendus = visuelsArmee ? slotsAttendus().length : 0
  const enAttenteDeVisuels = visuelsArmee ? await languesEnAttenteDeVisuels(visuelsAttendus, { event }) : []

  
  const item = await pickPendingItem({
    event, onlyMcp, onlyProvided, servedFamilies,
    excludeLangs: [...excludeLangs, ...enAttenteDeVisuels],
  })
  if (!item) {
    
    
    
    
    const stale = await pickUnpublishedDoneItem({ event, onlyMcp, excludeLangs, visuelsAttendus })
    if (!stale) {
      const quotaAtteint = porte.open && excludeLangs.length > 0
      return {
        processed: false,
        message: !porte.open
          ? cadenceMsg
          : quotaAtteint
            ? describeCadence({ open: false, state: 'quota' }, cadence) + ` Langue(s) servie(s) aujourd'hui : ${excludeLangs.join(', ')}.`
            : onlyProvided
              ? 'Aucun texte fourni à publier — pas de clé LLM chez le tenant, les briefs restent en attente de rédaction.'
              : 'Queue vide',
        cadence: porte.state,
        published_today: compteurs.publishedToday,
      }
    }

    
    
    const dbStale = useClientDb(event)
    const catalogStale = await loadBlogLinkCatalog(dbStale, {
      idLang: stale.id_lang || 1, excludeIdCms: stale.id_cms, event, subject: stale.title, brief: stale.instructions || '',
    })
    const jugementStale = await jugerAvantPublication(event, dbStale, stale, {
      html: stale.content_html || '',
      metaTitle: stale.meta_title,
      metaDescription: stale.meta_description,
      optimizedSlug: stale.optimized_slug,
      faqCount: Number(stale.faq_count || 0),
      faqJson: stale.faq_json,
    }, catalogStale, { bloquant: stale.source !== 'mcp' })
    if (jugementStale.retenir) {
      return {
        processed: false,
        held: true,
        cadence: porte.state,
        id_redaction: stale.id_redaction,
        id_cms: stale.id_cms,
        quality: jugementStale.note,
        message: `Rattrapage retenu en relecture — ${resumeNote(jugementStale.note)}`,
      }
    }
    
    
    if (await attendreVisuels(event, dbStale, stale, visuelsArmee)) {
      return {
        processed: false,
        held: true,
        waiting_visuals: true,
        cadence: porte.state,
        id_redaction: stale.id_redaction,
        id_cms: stale.id_cms,
        message: 'Rattrapage retenu — visuels du corps incomplets',
      }
    }

    const pub = await publishRedactionToArticle(dbStale, stale.id_cms, {
      idLang: stale.id_lang,
      contentHtml: stale.content_html || '',
      metaTitle: stale.meta_title,
      metaDescription: stale.meta_description,
      optimizedSlug: stale.optimized_slug,
    })
    if (pub.published) await markPublished(stale.id_redaction, { event })
    return {
      processed: pub.published,
      backfilled: pub.published,
      cadence: porte.state,
      id_redaction: stale.id_redaction,
      id_cms: stale.id_cms,
      first_publication: pub.firstPublication,
      slug_applied: pub.slugApplied,
      publication_stamped: pub.publicationStamped,
      ...(pub.stampError ? { stamp_error: pub.stampError } : {}),
      message: pub.published ? 'Article rattrapé — texte mis en ligne' : `Rattrapage impossible : ${pub.reason}`,
    }
  }

  
  await markProcessing(item.id_redaction, { event })

  
  const db = useClientDb(event)

  
  
  
  let call: LlmCall | null = null

  
  
  let strippedAttributions: string[] = []

  
  
  
  let strippedInternalLinks: string[] = []

  try {
    
    
    
    
    if (item.source === 'mcp') {
      if (!item.content_html) {
        throw new Error(
          'source=mcp mais content_html vide — article non enfilé correctement. Vérifier create_blog_article.',
        )
      }
      const result = buildProvidedResult(item.content_html, item)

      await storeResult(item.id_redaction, {
        contentHtml: result.content_html,
        faqJson: result.faq_json,
        wordCount: result.word_count,
        faqCount: result.faq_count,
        metaTitle: result.meta_title,
        metaDescription: result.meta_description,
        optimizedSlug: result.optimized_slug,
      }, { event })

      
      
      await jugerAvantPublication(event, db, item, {
        html: result.content_html,
        metaTitle: result.meta_title,
        metaDescription: result.meta_description,
        optimizedSlug: result.optimized_slug,
        faqCount: result.faq_count,
        faqJson: result.faq_json,
      }, null, { bloquant: false })

      
      
      
      const pub = await publishRedactionToArticle(db, item.id_cms, {
        idLang: item.id_lang,
        contentHtml: result.content_html,
        metaTitle: result.meta_title,
        metaDescription: result.meta_description,
        optimizedSlug: result.optimized_slug,
        faqJson: result.faq_json,
      })

      if (pub.published) await markPublished(item.id_redaction, { event })
      return {
        processed: true,
        id_redaction: item.id_redaction,
        source: 'mcp',
        cadence: porte.state,
        published: pub.published,
        first_publication: pub.firstPublication,
        slug_applied: pub.slugApplied,
        word_count: result.word_count,
        faq_count: result.faq_count,
        
        
        
        faq_stored: pub.faqCount,
        
        
        author_set: pub.authorSet,
        
        
        
        publication_stamped: pub.publicationStamped,
        ...(pub.stampError ? { stamp_error: pub.stampError } : {}),
        note: 'Contenu fourni par le client — LLM tenant non consommé.',
      }
    }

    

    
    
    
    
    
    
    const provider = getProvider(item.model || 'claude-sonnet-5')

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const contenuFourni = item.source === 'provided' && !!item.content_html?.trim()

    let apiKey: string | undefined
    let keySource = contenuFourni ? 'fourni (hors tenant)' : 'cs_llm_config'
    
    
    
    const llmCfg = contenuFourni
      ? null
      : await readLlmConfigByProvider(db, toLlmProvider(provider)).catch(() => null)
    if (contenuFourni) {
      
    } else if (llmCfg?.apiKey) {
      apiKey = llmCfg.apiKey
    } else {
      
      
      
      const configJson = await getClientConfigJson(item.tenant, { event })
      const config = configJson ? JSON.parse(configJson) : {}
      apiKey = (config.aiKeys || {})[provider]
      keySource = 'clientconfig.aiKeys'
    }

    if (!apiKey && !contenuFourni) {
      
      
      if (llmCfg?.keyUndecipherable) {
        throw new Error(
          `Clé API ${provider} enregistrée dans cs_llm_config mais INDÉCHIFFRABLE `
          + `(clé maître de chiffrement changée, ou blob corrompu) — ce n'est PAS `
          + `une absence de clé. Vérifier API_ENCRYPTION_KEY côté tenant avant de `
          + `ressaisir quoi que ce soit.`,
        )
      }
      throw new Error(`Clé API ${provider} non configurée. Ajoutez-la dans Hub > IA > LLM (registre chiffré cs_llm_config).`)
    }

    
    
    
    const { existingContent, brandContext, shopName } = await loadRedactionContext(db, item)

    
    
    
    
    
    
    
    
    
    
    
    const linkCatalog = await loadBlogLinkCatalog(db, {
      
      
      idLang: item.id_lang || 1, excludeIdCms: item.id_cms, event,
      
      
      
      
      subject: item.title,
      
      brief: item.instructions || '',
    })

    
    
    
    const sourcesVerifiees = await loadValidSources(db, 'cms', item.id_cms, item.id_lang || 1)

    
    
    
    
    
    
    
    let result: LlmResponse
    if (contenuFourni) {
      result = buildProvidedResult(item.content_html, item)
    } else {
      const prompt = buildRedactionPrompt(item, existingContent, brandContext, promptLinkCatalog(linkCatalog), linkCatalog.iso || 'fr', sourcesVerifiees)

      if (provider === 'google') {
        call = await callGemini(prompt, apiKey!, item.model)
      } else if (provider === 'anthropic') {
        call = await callClaude(prompt, apiKey!, item.model)
      } else {
        call = await callOpenAI(prompt, apiKey!, item.model)
      }

      if (!call.text) {
        throw new Error('Réponse LLM vide')
      }

      
      
      
      
      if (call.truncated) {
        throw new Error(
          `Réponse tronquée au plafond de ${MAX_OUTPUT_TOKENS} tokens de sortie `
          + `(${call.tokensOut ?? '?'} consommés). Raccourcir la consigne ou relever MAX_OUTPUT_TOKENS.`,
        )
      }

      
      result = parseResponse(call.text)
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const sources: CitedSource[] = sourcesVerifiees.map(s => ({ url: s.url, title: s.title }))
    
    
    
    const externes = stripUnlistedExternalLinks(result.content_html, sources, linkCatalog.shopHosts,
      extractFactUrls((await loadBrandBrief()).facts))
    result.content_html = externes.html
    if (externes.stripped.length) {
      console.warn(`[redaction #${item.id_redaction}] lien(s) externe(s) hors sources vérifiées retiré(s) : ${externes.stripped.join(', ')}`)
    }
    const guardOpts = { brandName: shopName, sources }
    const guard = stripUnverifiedAttributions(result.content_html, { sources })
    result.content_html = guard.html
    strippedAttributions = guard.stripped

    const verdict = auditCitations(result.content_html, guardOpts)
    if (!verdict.ok) {
      
      
      throw new Error(`Citation d'autorité non adossée — article refusé. ${verdict.reason}`)
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const maillage = applyBlogMesh(result.content_html, linkCatalog)
    result.content_html = maillage.html
    strippedInternalLinks = maillage.stripped
    if (maillage.placed.length) {
      console.log(`[redaction #${item.id_redaction}] maillage transactionnel posé dans le texte : `
        + maillage.placed.map(x => `${x.url} sur « ${x.ancre} »`).join(', '))
    }

    assertNoDeadInternalLinks(result.content_html, linkCatalog)

    
    
    
    
    
    
    
    const carenceMaillage = assertMeshQuota(result.content_html, linkCatalog)
    if (carenceMaillage) console.warn(`[redaction #${item.id_redaction}] ${carenceMaillage}`)

    
    
    
    
    
    
    
    
    
    const cost = (call && call.tokensIn !== null && call.tokensOut !== null)
      ? costUsd(item.model, call.tokensIn, call.tokensOut)
      : null

    await storeResult(item.id_redaction, {
      contentHtml: result.content_html,
      faqJson: result.faq_json,
      wordCount: result.word_count,
      faqCount: result.faq_count,
      metaTitle: result.meta_title,
      metaDescription: result.meta_description,
      optimizedSlug: result.optimized_slug,
      tokensIn: call?.tokensIn ?? null,
      tokensOut: call?.tokensOut ?? null,
      costUsd: cost,
    }, { event })

    
    
    
    
    const coverSceneStored = await storeCoverScene(item.id_redaction, result.cover_scene, { event })

    
    
    
    const visualBriefsStored = result.visuels
      ? await storeVisualBriefs(db, item.id_cms, item.id_lang || 1, result.visuels)
      : 0
    if (result.visuels?.rejets.length) {
      console.warn(`[process-redaction] #${item.id_redaction} visuels :`, result.visuels.rejets.join(' | '))
    }

    
    
    
    if (!contenuFourni) {
      await storeProvider(item.id_redaction, provider === 'anthropic' ? 'claude' : provider === 'google' ? 'gemini' : provider, { event })
    }

    
    
    
    
    
    
    
    const jugement = await jugerAvantPublication(event, db, item, {
      html: result.content_html,
      metaTitle: result.meta_title,
      metaDescription: result.meta_description,
      optimizedSlug: result.optimized_slug,
      faqCount: result.faq_count,
      faqJson: result.faq_json,
    }, linkCatalog, { bloquant: true })
    if (jugement.retenir) {
      return {
        processed: true,
        held: true,
        id_redaction: item.id_redaction,
        published: false,
        cadence: porte.state,
        model: item.model,
        word_count: result.word_count,
        quality: jugement.note,
        message: `Retenu en relecture — ${resumeNote(jugement.note)}`,
        cover_scene: coverSceneStored,
        visual_briefs: visualBriefsStored,
      }
    }

    
    
    
    if (await attendreVisuels(event, db, item, visuelsArmee)) {
      return {
        processed: true,
        held: true,
        waiting_visuals: true,
        id_redaction: item.id_redaction,
        published: false,
        cadence: porte.state,
        model: item.model,
        word_count: result.word_count,
        quality_score: jugement.note.score,
        message: 'Rédigé — en attente de ses visuels du corps (1 infographie + 2 photos validées)',
        cover_scene: coverSceneStored,
        visual_briefs: visualBriefsStored,
      }
    }

    
    const pub = await publishRedactionToArticle(db, item.id_cms, {
      idLang: item.id_lang,
      contentHtml: result.content_html,
      metaTitle: result.meta_title,
      metaDescription: result.meta_description,
      optimizedSlug: result.optimized_slug,
      faqJson: result.faq_json,
    })

    if (pub.published) await markPublished(item.id_redaction, { event })
    return {
      processed: true,
      id_redaction: item.id_redaction,
      published: pub.published,
      first_publication: pub.firstPublication,
      slug_applied: pub.slugApplied,
      cadence: porte.state,
      published_today: compteurs.publishedToday,
      model: item.model,
      word_count: result.word_count,
      faq_count: result.faq_count,
      
      
      faq_stored: pub.faqCount,
      
      author_set: pub.authorSet,
      
      publication_stamped: pub.publicationStamped,
      ...(pub.stampError ? { stamp_error: pub.stampError } : {}),
      tokens_in: call?.tokensIn ?? null,
      tokens_out: call?.tokensOut ?? null,
      cost_usd: cost,
      key_source: keySource,
      attributions_stripped: strippedAttributions,
      internal_links_stripped: strippedInternalLinks,
      
      
      
      
      cover_scene: coverSceneStored,
      quality_score: jugement.note.score,
      ...(jugement.approuve ? { quality_approved: true } : {}),
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err)
    
    
    const coutEngage = (call && call.tokensIn !== null && call.tokensOut !== null)
      ? costUsd(item.model, call.tokensIn, call.tokensOut)
      : null
    await markError(item.id_redaction, errMsg, { event }, {
      tokensIn: call?.tokensIn ?? null,
      tokensOut: call?.tokensOut ?? null,
      costUsd: coutEngage,
    })
    return {
      processed: false,
      id_redaction: item.id_redaction,
      error: errMsg.substring(0, 500),
      tokens_in: call?.tokensIn ?? null,
      tokens_out: call?.tokensOut ?? null,
      cost_usd: coutEngage,
      attributions_stripped: strippedAttributions,
      internal_links_stripped: strippedInternalLinks,
    }
  }
})
