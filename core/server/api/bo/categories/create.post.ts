

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

import { requireEmployeeSession } from '~/server/utils/session'
import { callAction } from '~/server/utils/hooks-bus'
import { HOOKS_ACTION, type ActionCategorySavedPayload } from '~/server/utils/hooks-catalog'
import { traduireVersLanguesActives } from '~/server/utils/traduction-creation-db'
import { slugDe } from '~/server/utils/traduction-creation'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const { name, parentId, active } = await readBody<{ name: string; parentId?: number; active?: boolean }>(event)
  if (!name?.trim()) throw createError({ statusCode: 400, message: 'Nom requis' })
  const d = usePocPg()
  const parentIdResolved = parentId || 2
  const activeFlag = active !== false ? 1 : 0
  const trimmed = name.trim()
  const slug = trimmed.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const parentResult: any = await d.execute(sql`
    SELECT id_category, level_depth FROM cs_main.ps_category WHERE id_category = ${parentIdResolved}
  `)
  const parent = ((parentResult as any) as any[])[0]
  const depth = (parent?.level_depth ?? 1) + 1

  const maxPosResult: any = await d.execute(sql`
    SELECT COALESCE(MAX(position), 0) + 1 AS "pos" FROM cs_main.ps_category WHERE id_parent = ${parentIdResolved}
  `)
  const pos = Number(((maxPosResult as any) as any[])[0]?.pos || 0)

  
  
  const insertResult: any = await d.execute(sql`
    INSERT INTO cs_main.ps_category (id_parent, id_shop_default, level_depth, active, date_add, date_upd, position, redirect_type)
    VALUES (${parentIdResolved}, 1, ${depth}, ${activeFlag}, NOW(), NOW(), ${pos}, '301')
    RETURNING id_category
  `)
  const catId = Number(((insertResult as any) as any[])[0]?.id_category ?? 0)

  await d.execute(sql`
    INSERT INTO cs_main.ps_category_lang (id_category, id_lang, id_shop, name, description, link_rewrite, meta_title, meta_description)
    VALUES (${catId}, 1, 1, ${trimmed}, '', ${slug}, ${trimmed}, '')
  `)

  await d.execute(sql`INSERT INTO cs_main.ps_category_shop (id_category, id_shop) VALUES (${catId}, 1)`)

  
  
  await d.execute(sql`
    INSERT INTO cs_main.ps_category_group (id_category, id_group)
    SELECT ${catId}, id_group FROM cs_main.ps_category_group WHERE id_category = ${parentIdResolved}
    ON CONFLICT DO NOTHING
  `)

  
  
  
  const langues = await traduireVersLanguesActives({ name: trimmed })
  for (const [idLang, champs] of langues.traduites) {
    const nom = String(champs.name)
    const slugLangue = slugDe(nom)
    if (!slugLangue) continue 
    await d.execute(sql`
      INSERT INTO cs_main.ps_category_lang (id_category, id_lang, id_shop, name, description, link_rewrite, meta_title, meta_description)
      VALUES (${catId}, ${idLang}, 1, ${nom}, '', ${slugLangue}, ${nom}, '')
      ON CONFLICT DO NOTHING
    `)
  }

  callAction<ActionCategorySavedPayload>(HOOKS_ACTION.CATEGORY_SAVED, {
    categoryId: catId, created: true,
  }).catch((err: any) => {
    console.error(`[bo/categories/create] hook '${HOOKS_ACTION.CATEGORY_SAVED}' failed:`, err?.message)
  })

  return {
    success: true,
    id: catId,
    langues: { traduites: [...langues.traduites.keys()], nonTraduites: langues.nonTraduites },
  }
})
