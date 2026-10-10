

import {
  getSectionMeta,
  getActiveLangs,
  updateSectionConfigPartial,
  getSectionLangIds,
  touchSection,
  upsertSectionLang,
  type ActiveLang,
  type SectionConfig,
} from '~/modules/homepage-section/server/utils/homepage-section'
import {
  toDesiredBlocks,
  planBlockOps,
  applyBlockOps,
  loadExistingBlocks,
  CTA_FROM_BLOCK_TYPES,
  type BlockOp,
} from '~/server/utils/page-section-save'
import { listSectionLinkFields, validateLink } from '~/utils/section-link-fields'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

function configFromPayload(type: string, payload: any): SectionConfig {
  const cfg: SectionConfig = {}
  if (payload.limit !== undefined) cfg.limit_items = payload.limit === null ? null : Number(payload.limit)
  if (payload.interval_ms !== undefined) cfg.interval_ms = payload.interval_ms === null ? null : Number(payload.interval_ms)
  if (payload.cols !== undefined) cfg.cols = payload.cols === null ? null : Number(payload.cols)
  if (payload.height !== undefined) cfg.height_px = payload.height === null ? null : Number(payload.height)
  if (payload.handle !== undefined) cfg.social_handle = payload.handle
  if (payload.url !== undefined) cfg.social_url = payload.url
  if (payload.featuredPosition !== undefined) {
    cfg.featured_position = payload.featuredPosition === 'left' || payload.featuredPosition === 'right'
      ? payload.featuredPosition
      : null
  }
  
  
  
  if (payload.cta_to !== undefined && !CTA_FROM_BLOCK_TYPES.has(type)) cfg.cta_href = payload.cta_to
  return cfg
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, message: 'id (number) requis' })
  }
  const idSection = Number(id)

  const body = await readBody<{ title?: any; subtitle?: any; payload?: any }>(event)
  if (!body || (body.title === undefined && body.subtitle === undefined && body.payload === undefined)) {
    throw createError({ statusCode: 400, message: 'Au moins un champ (title, subtitle, payload) requis' })
  }

  
  
  const meta = await getSectionMeta(idSection, { event })
  if (!meta) {
    throw createError({ statusCode: 404, message: `Section ${idSection} introuvable` })
  }

  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)
  const langs: ActiveLang[] = await getActiveLangs({ event })
  const iso = langs.find((l) => l.id_lang === idLang)?.iso_code || 'fr'
  const baseLang = langs.find((l) => l.id_lang === 1)
  const baseIso = baseLang?.iso_code || 'fr'

  const dryRun = String(getQuery(event).dry_run || '') === '1'
  const ops: BlockOp[] = []

  if (body.payload !== undefined && body.payload && typeof body.payload === 'object') {
    
    
    
    
    
    const lienFautif = listSectionLinkFields(body.payload)
      .map((champ) => ({ champ, verdict: validateLink(champ.value) }))
      .find(({ verdict }) => !verdict.ok)
    if (lienFautif) {
      throw createError({
        statusCode: 400,
        message: `Lien invalide (${lienFautif.champ.path.join('.')}) : ${lienFautif.verdict.raison}`,
      })
    }

    const cfg = configFromPayload(meta.type, body.payload)
    if (!dryRun && Object.keys(cfg).length) {
      await updateSectionConfigPartial(idSection, cfg, { event }, meta.parent_type, meta.parent_id)
    }

    const plan = toDesiredBlocks(meta.type, body.payload)
    if (plan) {
      const existing = await loadExistingBlocks(idSection)
      ops.push(...planBlockOps(existing, plan, { idLang, iso, baseLangId: 1, baseIso }))
      if (!dryRun) await applyBlockOps(idSection, ops)
    }
    if (!dryRun) await touchSection(idSection, { event }, meta.parent_type, meta.parent_id)
  } else if (!dryRun) {
    await touchSection(idSection, { event }, meta.parent_type, meta.parent_id)
  }

  if (!dryRun && (body.title !== undefined || body.subtitle !== undefined)) {
    
    
    const title = body.title !== undefined ? pickLang(body.title, iso) : undefined
    const subtitle = body.subtitle !== undefined ? pickLang(body.subtitle, iso) : undefined
    await upsertSectionLang(idSection, idLang, title, subtitle, { event })

    
    
    if (idLang !== 1) {
      const existingLangs = await getSectionLangIds(idSection, { event })
      if (!existingLangs.includes(1)) {
        await upsertSectionLang(
          idSection,
          1,
          body.title !== undefined ? pickLang(body.title, baseIso) : undefined,
          body.subtitle !== undefined ? pickLang(body.subtitle, baseIso) : undefined,
          { event },
        )
      }
    }
  }

  return dryRun
    ? { ok: true, id: idSection, dry_run: true, type: meta.type, parent: meta.parent_type, ops }
    : { ok: true, id: idSection, ops: ops.length }
})
