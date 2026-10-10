

import { useClientDb } from '~/server/utils/db'
import {
  buildGridColumnsMap,
  buildProductIdMap,
  resolveGridColumns,
  resolveProductIdOnReinsert,
} from '~/server/utils/megamenu-preserve'
import {
  deleteMegamenuForClient,
  insertMegamenuRow,
  upsertMegamenuLangRow,
} from '~/modules/megamenu/server/utils/megamenu'

interface BuilderMenuLink {
  label: string | Record<string, string>
  href: string
  description?: string | Record<string, string>
  badge?: string | Record<string, string>
  psId?: number
  psCategoryId?: number
  showPsChildren?: boolean
}

interface BuilderMegaColumn {
  title?: string | Record<string, string>
  icon?: string
  links: BuilderMenuLink[]
}

interface BuilderMenuItem {
  label: string | Record<string, string>
  href?: string
  isMegaMenu?: boolean
  megaMenu?: BuilderMegaColumn[]
  children?: BuilderMenuLink[]
  bgColor?: string
  textColor?: string
  style?: Record<string, string>
  highlight?: boolean
  rightAlign?: boolean
  align?: string
  cssClass?: string
  external?: boolean
  badge?: string | Record<string, string>
  badgeBg?: string
  badgeColor?: string
  barVisible?: boolean
}

function buildStyleJson(item: BuilderMenuItem): string | null {
  const style: Record<string, string> = item.style ? { ...item.style } : {}
  if (item.bgColor) {
    style.backgroundColor = item.bgColor
    style.color = item.textColor || '#fff'
  }
  if (item.badgeBg) style.badgeBg = item.badgeBg
  if (item.badgeColor) style.badgeColor = item.badgeColor
  return Object.keys(style).length ? JSON.stringify(style) : null
}

function resolveLangValue(raw: string | Record<string, string> | undefined | null, iso: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object') {
    const v = raw[iso] ?? raw.fr
    if (v) return v
    for (const k of Object.keys(raw)) {
      if (raw[k]) return raw[k]
    }
    return null
  }
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ items: BuilderMenuItem[] }>(event)
  if (!body?.items || !Array.isArray(body.items)) {
    throw createError({ statusCode: 400, message: 'items[] requis' })
  }

  const db = useClientDb(event)
  const { clientId } = db

  
  const langs = await db.query<{ id_lang: number; iso_code: string }>(
    `SELECT id_lang, iso_code FROM ps_lang WHERE active = 1`,
  )
  if (!langs.length) {
    throw createError({ statusCode: 500, message: 'Aucune langue active sur le tenant' })
  }

  async function insertLangRows(
    idMegamenu: number,
    label: string | Record<string, string>,
    description: string | Record<string, string> | null,
    badge: string | Record<string, string> | null,
    groupTitle: string | Record<string, string> | null,
  ) {
    for (const l of langs) {
      const lbl = resolveLangValue(label, l.iso_code) ?? ''
      const dsc = resolveLangValue(description, l.iso_code)
      const bdg = resolveLangValue(badge, l.iso_code)
      const grp = resolveLangValue(groupTitle, l.iso_code)
      await upsertMegamenuLangRow(idMegamenu, l.id_lang, lbl, dsc, bdg, grp, { event })
    }
  }

  
  
  
  
  
  if (!body.items.length) {
    const existing = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM cs_main.cs_megamenu WHERE client_id = ?`,
      [clientId],
    )
    const n = existing?.[0]?.n ?? 0
    if (n > 0) {
      throw createError({
        statusCode: 400,
        message: `Refus anti-wipe : payload menu vide alors que ${n} item(s) existent (client=${clientId}). Vider le menu exige une action explicite, pas un save builder partiel.`,
      })
    }
    
    return { ok: true, count: 0 }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const preservedIcon = await db.query<{
    parent_fr_label: string; href: string; fr_label: string
    icon: string | null; icon_role: string | null
  }>(
    `SELECT COALESCE(pfrl.label,'') AS parent_fr_label,
            COALESCE(m.href,'') AS href, COALESCE(frl.label,'') AS fr_label,
            m.icon, m.icon_role
       FROM cs_main.cs_megamenu m
       JOIN cs_main.cs_megamenu_lang frl
         ON frl.id_megamenu = m.id_megamenu AND frl.id_lang = 1
       LEFT JOIN cs_main.cs_megamenu_lang pfrl
         ON pfrl.id_megamenu = m.parent_id AND pfrl.id_lang = 1
      WHERE m.client_id = ? AND m.icon IS NOT NULL AND m.icon <> ''`,
    [clientId],
  )

  
  
  
  
  
  const preservedGrid = await db.query<{ fr_label: string; grid_columns: number | null }>(
    `SELECT COALESCE(frl.label,'') AS fr_label, m.grid_columns
       FROM cs_main.cs_megamenu m
       JOIN cs_main.cs_megamenu_lang frl
         ON frl.id_megamenu = m.id_megamenu AND frl.id_lang = 1
      WHERE m.client_id = ? AND m.parent_id IS NULL AND m.grid_columns IS NOT NULL`,
    [clientId],
  )
  const gridByLabel = buildGridColumnsMap(preservedGrid)

  
  
  
  
  const preservedProduct = await db.query<{ fr_label: string; ps_product_id: number | null }>(
    `SELECT COALESCE(frl.label,'') AS fr_label, m.ps_product_id
       FROM cs_main.cs_megamenu m
       JOIN cs_main.cs_megamenu_lang frl
         ON frl.id_megamenu = m.id_megamenu AND frl.id_lang = 1
      WHERE m.client_id = ? AND m.parent_id IS NULL AND m.ps_product_id IS NOT NULL`,
    [clientId],
  )
  const productByLabel = buildProductIdMap(preservedProduct)

  const preservedLang = await db.query<{
    id_lang: number; parent_fr_label: string; href: string; fr_label: string
    label: string | null; description: string | null; badge: string | null; group_title: string | null
  }>(
    `SELECT ml.id_lang, COALESCE(pfrl.label,'') AS parent_fr_label,
            COALESCE(m.href,'') AS href, COALESCE(frl.label,'') AS fr_label,
            ml.label, ml.description, ml.badge, ml.group_title
       FROM cs_main.cs_megamenu m
       JOIN cs_main.cs_megamenu_lang ml  ON ml.id_megamenu  = m.id_megamenu AND ml.id_lang <> 1
       JOIN cs_main.cs_megamenu_lang frl ON frl.id_megamenu = m.id_megamenu AND frl.id_lang = 1
       LEFT JOIN cs_main.cs_megamenu_lang pfrl
         ON pfrl.id_megamenu = m.parent_id AND pfrl.id_lang = 1
      WHERE m.client_id = ?`,
    [clientId],
  )

  
  await deleteMegamenuForClient(clientId, { event })

  const rootItems: { id: number; type: 'link' | 'megamenu' | 'dropdown'; item: BuilderMenuItem }[] = []
  let pos = 0
  for (const item of body.items) {
    const rootType = item.isMegaMenu ? 'megamenu'
      : (item.megaMenu?.length || item.children?.length) ? 'dropdown'
      : 'link'
    const cssClass = (item.rightAlign || item.align === 'right') ? 'ml-auto' : (item.cssClass || null)
    const rootStyle = buildStyleJson(item)
    
    
    const rootFrLabel = resolveLangValue(item.label, 'fr') ?? ''
    const gridCols = resolveGridColumns(rootType, rootFrLabel, gridByLabel)
    const productId = resolveProductIdOnReinsert(rootType, rootFrLabel, productByLabel)

    const insertId = await insertMegamenuRow({
      clientId,
      parentId: null,
      type: rootType,
      href: item.href || null,
      icon: null,
      styleJson: rootStyle,
      gridColumns: gridCols,
      cssClass,
      psCategoryId: null,
      psProductId: productId,
      showPsChildren: 0,
      position: pos++,
      barVisible: item.barVisible === false ? 0 : 1,
    }, { event })
    await insertLangRows(insertId, item.label, null, item.badge || null, null)
    rootItems.push({ id: insertId, type: rootType, item })
  }

  for (const { id: parentId, type: rootType, item } of rootItems) {
    if (rootType === 'megamenu' && item.megaMenu?.length) {
      
      
      
      
      
      
      let childPos = 0
      for (const col of item.megaMenu) {
        for (const link of col.links) {
          const insertId = await insertMegamenuRow({
            clientId,
            parentId,
            type: 'link',
            href: link.href,
            icon: col.icon || null,
            psCategoryId: link.psCategoryId || null,
            showPsChildren: link.showPsChildren ? 1 : 0,
            position: childPos++,
          }, { event })
          await insertLangRows(insertId, link.label, link.description || null, link.badge || null, col.title || null)
        }
      }
    } else if (rootType === 'dropdown') {
      const links = item.megaMenu?.flatMap((c) => c.links) || item.children || []
      let childPos = 0
      for (const link of links) {
        const insertId = await insertMegamenuRow({
          clientId,
          parentId,
          type: 'link',
          href: link.href,
          psCategoryId: link.psCategoryId || null,
          showPsChildren: link.showPsChildren ? 1 : 0,
          position: childPos++,
        }, { event })
        await insertLangRows(insertId, link.label, link.description || null, link.badge || null, null)
      }
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  for (const p of preservedIcon) {
    await db.run(
      `UPDATE cs_main.cs_megamenu m
          SET icon = COALESCE(NULLIF(m.icon, ''), ?),
              icon_role = COALESCE(NULLIF(m.icon_role, 'picto'), ?, 'picto')
        WHERE m.client_id = ?
          AND COALESCE(m.href,'') = ?
          AND m.id_megamenu IN (
            SELECT m2.id_megamenu
              FROM cs_main.cs_megamenu m2
              JOIN cs_main.cs_megamenu_lang frl
                ON frl.id_megamenu = m2.id_megamenu AND frl.id_lang = 1
              LEFT JOIN cs_main.cs_megamenu_lang pfrl
                ON pfrl.id_megamenu = m2.parent_id AND pfrl.id_lang = 1
             WHERE COALESCE(frl.label,'') = ? AND COALESCE(pfrl.label,'') = ?
          )`,
      [p.icon, p.icon_role, clientId, p.href, p.fr_label, p.parent_fr_label],
    )
  }

  
  
  
  
  for (const r of preservedLang) {
    await db.run(
      `UPDATE cs_main.cs_megamenu_lang tl
          SET label       = COALESCE(?, tl.label),
              description = COALESCE(?, tl.description),
              badge       = COALESCE(?, tl.badge),
              group_title = COALESCE(?, tl.group_title)
        WHERE tl.id_lang = ?
          AND tl.id_megamenu IN (
            SELECT m.id_megamenu
              FROM cs_main.cs_megamenu m
              JOIN cs_main.cs_megamenu_lang frl
                ON frl.id_megamenu = m.id_megamenu AND frl.id_lang = 1
              LEFT JOIN cs_main.cs_megamenu_lang pfrl
                ON pfrl.id_megamenu = m.parent_id AND pfrl.id_lang = 1
             WHERE m.client_id = ? AND COALESCE(m.href,'') = ?
               AND COALESCE(frl.label,'') = ? AND COALESCE(pfrl.label,'') = ?
          )`,
      [
        r.label, r.description, r.badge, r.group_title, r.id_lang,
        clientId, r.href, r.fr_label, r.parent_fr_label,
      ],
    )
  }

  return { ok: true, count: rootItems.length }
})
