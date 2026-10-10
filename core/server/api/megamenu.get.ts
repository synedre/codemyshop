

import { useClientDb } from '~/server/utils/db'
import { loadSiloSlugMapForLang, localizeSiloHref } from '~/server/utils/localize-silo-href'
import { chargerContexteHrefsBlog, estHrefBlog, localiserHrefBlog } from '~/server/utils/blog-href-localize'
import { ensureTrailingSlash, isCategoryHref } from '~/server/utils/category-url'
import { loadCategoryRootSlugs } from '~/server/utils/category-roots'
import { t } from '~/server/utils/i18n'
import {
  fetchProductCardsByIds,
  computeCardAttributes,
  computeProductBadges,
  type ProductCard,
} from '~/server/utils/product-card-mapper'
import { applyTaxToCards } from '~/server/utils/product-card-tax'
import { TENANT_PG_FR_COUNTRY_ID } from '~/server/utils/ps-tax'

export type MegamenuProductCard = ProductCard

const lastGoodMega = new Map<string, MegamenuItem[]>()

interface MegamenuRow {
  id_megamenu: number
  client_id: string
  parent_id: number | null
  type: 'link' | 'megamenu' | 'dropdown'
  label: string | null
  label_fr: string | null
  href: string | null
  icon: string | null
  description: string | null
  description_fr: string | null
  badge: string | null
  badge_fr: string | null
  group_title: string | null
  group_title_fr: string | null
  icon_role: string | null
  style_json: string | Record<string, unknown> | null
  grid_columns: number | null
  css_class: string | null
  ps_category_id: number | null
  ps_product_id: number | null
  show_ps_children: number
  position: number
  bar_visible: number
}

interface PsChildCategory {
  id: number
  name: string
  slug: string
  href: string
  psChildren?: PsChildCategory[]
}

export interface MegamenuItem {
  id: number
  type: 'link' | 'megamenu' | 'dropdown'
  label: Record<string, string>
  href: string | null
  icon: string | null
  

  iconRole: string
  description: string | null
  badge: string | null
  groupTitle: string | null
  

  groupKey: string | null
  style: Record<string, string> | null
  gridColumns: number | null
  cssClass: string | null
  psCategoryId: number | null
  

  psProductId: number | null
  
  product?: MegamenuProductCard | null
  showPsChildren: boolean
  position: number
  barVisible: boolean
  children: MegamenuItem[]
  psChildren: PsChildCategory[]
}

function parseJson(raw: unknown): any {
  if (!raw) return null
  
  
  
  
  if (typeof raw === 'object') return raw
  try { return JSON.parse(String(raw)) } catch { return null }
}

function rowToItem(row: MegamenuRow, roots: Set<string>): MegamenuItem {
  const label       = row.label       ?? row.label_fr       ?? ''
  const description = row.description ?? row.description_fr ?? null
  const badge       = row.badge       ?? row.badge_fr       ?? null
  const groupTitle  = row.group_title ?? row.group_title_fr ?? null
  
  
  const groupKey    = row.group_title_fr ?? row.group_title ?? null

  
  
  
  const normHref = isCategoryHref(row.href, roots) ? ensureTrailingSlash(row.href) : row.href

  return {
    id: row.id_megamenu,
    type: row.type,
    label: { fr: label },
    href: normHref,
    icon: row.icon,
    
    
    iconRole: row.icon_role ?? 'picto',
    description,
    badge,
    groupTitle,
    groupKey,
    style: parseJson(row.style_json),
    gridColumns: row.grid_columns,
    cssClass: row.css_class,
    psCategoryId: row.ps_category_id,
    psProductId: row.ps_product_id,
    showPsChildren: !!row.show_ps_children,
    position: row.position,
    barVisible: row.bar_visible == null ? true : !!row.bar_visible,
    children: [],
    psChildren: [],
  }
}

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)

  
  
  
  
  const rawContext = String(getQuery(event).context ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const menuContext = rawContext || 'default'

  const cacheKey = `${db.clientId}:${idLang}:${menuContext}`

  try {
    const { loadMegamenuTreeRows } = await import('~/modules/megamenu/server/utils/megamenu')
    const items = await loadMegamenuTreeRows(db.clientId, idLang, { event }, menuContext)
    
    const rows: MegamenuRow[] = items.map((r) => ({
      id_megamenu: r.idMegamenu,
      client_id: r.clientId,
      parent_id: r.parentId,
      type: r.type,
      href: r.href,
      icon: r.icon,
      style_json: r.styleJson,
      grid_columns: r.gridColumns,
      css_class: r.cssClass,
      ps_category_id: r.psCategoryId,
      ps_product_id: r.psProductId,
      show_ps_children: r.showPsChildren,
      position: r.position,
      bar_visible: r.barVisible,
      label: r.label,
      description: r.description,
      badge: r.badge,
      group_title: r.groupTitle,
      label_fr: r.labelFr,
      description_fr: r.descriptionFr,
      badge_fr: r.badgeFr,
      group_title_fr: r.groupTitleFr,
    }))

    const byId = new Map<number, MegamenuItem>()
    const roots: MegamenuItem[] = []

    const categoryRoots = await loadCategoryRootSlugs()
    for (const row of rows) {
      const item = rowToItem(row, categoryRoots)
      byId.set(row.id_megamenu, item)
    }

    for (const row of rows) {
      const item = byId.get(row.id_megamenu)!
      if (row.parent_id === null) {
        roots.push(item)
      } else {
        const parent = byId.get(row.parent_id)
        if (parent) {
          parent.children.push(item)
        }
      }
    }

    
    const expandableItems = [...byId.values()].filter(i => i.showPsChildren && i.psCategoryId)
    if (expandableItems.length > 0) {
      const categoryIds = expandableItems.map(i => i.psCategoryId!)
      const placeholders = categoryIds.map(() => '?').join(',')

      
      
      const psChildren = await db.query<{
        id_category: number
        name: string
        link_rewrite: string
        id_parent: number
        position: number
      }>(
        `SELECT c.id_category,
                COALESCE(cl.name,         clf.name, '')         AS name,
                COALESCE(clf.link_rewrite, '')                  AS link_rewrite,
                c.id_parent, c.position
           FROM ps_category c
      LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
          WHERE c.id_parent IN (${placeholders}) AND c.active = 1
            AND (
              c.id_category IN (390, 391, 392)
              OR EXISTS (
                SELECT 1 FROM ps_product p
                JOIN ps_category_product cp ON cp.id_product = p.id_product
                JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
                WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
              )
            )
          ORDER BY c.id_parent, c.position`,
        [idLang, ...categoryIds],
      )

      
      
      
      
      
      
      const parentHrefMap = new Map<number, string>()
      for (const item of expandableItems) {
        parentHrefMap.set(item.psCategoryId!, item.href || '')
      }

      const childrenByParent = new Map<number, PsChildCategory[]>()
      for (const row of psChildren) {
        if (!childrenByParent.has(row.id_parent)) childrenByParent.set(row.id_parent, [])
        const parentHref = (parentHrefMap.get(row.id_parent) || '').replace(/\/+$/, '')
        const slug = row.link_rewrite
        childrenByParent.get(row.id_parent)!.push({
          id: row.id_category,
          name: row.name,
          slug,
          href: `${parentHref}/${slug}/`,
        })
      }

      
      const childCategoryIds = psChildren.map(r => r.id_category)
      if (childCategoryIds.length > 0) {
        const gcPlaceholders = childCategoryIds.map(() => '?').join(',')
        const grandchildren = await db.query<{
          id_category: number
          name: string
          link_rewrite: string
          id_parent: number
          position: number
        }>(
          `SELECT c.id_category,
                  COALESCE(cl.name,         clf.name, '')         AS name,
                  COALESCE(clf.link_rewrite, '')                  AS link_rewrite,
                  c.id_parent, c.position
             FROM ps_category c
        LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
        LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
            WHERE c.id_parent IN (${gcPlaceholders}) AND c.active = 1
              AND (
                c.id_category IN (390, 391, 392)
                OR EXISTS (
                  SELECT 1 FROM ps_product p
                  JOIN ps_category_product cp ON cp.id_product = p.id_product
                  JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
                  WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
                )
              )
            ORDER BY c.id_parent, c.position`,
          [idLang, ...childCategoryIds],
        )

        
        
        const psChildHrefMap = new Map<number, string>()
        for (const children of childrenByParent.values()) {
          for (const child of children) {
            psChildHrefMap.set(child.id, child.href)
          }
        }

        const gcByParent = new Map<number, PsChildCategory[]>()
        for (const row of grandchildren) {
          if (!gcByParent.has(row.id_parent)) gcByParent.set(row.id_parent, [])
          const parentHref = (psChildHrefMap.get(row.id_parent) || '').replace(/\/+$/, '')
          const slug = row.link_rewrite
          gcByParent.get(row.id_parent)!.push({
            id: row.id_category,
            name: row.name,
            slug,
            href: `${parentHref}/${slug}/`,
          })
        }

        for (const children of childrenByParent.values()) {
          for (const child of children) {
            const gc = gcByParent.get(child.id)
            if (gc?.length) child.psChildren = gc
          }
        }
      }

      
      for (const item of expandableItems) {
        const raw = childrenByParent.get(item.psCategoryId!) || []
        const existingHrefs = new Set(item.children.map(c => c.href?.replace(/\/+$/, '')))
        const existingNames = new Set(item.children.map(c => {
          const l = c.label as Record<string, string>
          return (l?.fr || Object.values(l)[0] || '').toLowerCase()
        }))
        item.psChildren = raw.filter(ps => {
          const hrefNorm = ps.href.replace(/\/+$/, '')
          const nameNorm = ps.name.toLowerCase()
          if (existingHrefs.has(hrefNorm)) return false
          if (existingNames.has(nameNorm)) return false
          return true
        })
        const seenIds = new Set<number>()
        const seenNames = new Set<string>()
        item.psChildren = item.psChildren.filter(ps => {
          const nameKey = ps.name.toLowerCase()
          if (seenIds.has(ps.id) || seenNames.has(nameKey)) return false
          seenIds.add(ps.id)
          seenNames.add(nameKey)
          return true
        })
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const rootHrefNeeded = [...byId.values()].filter(i => i.psCategoryId && !i.href)
    if (rootHrefNeeded.length > 0) {
      const rootIds = rootHrefNeeded.map(i => i.psCategoryId!)
      const rootPlaceholders = rootIds.map(() => '?').join(',')
      const rootRows = await db.query<{ id_category: number; link_rewrite: string }>(
        `SELECT c.id_category, COALESCE(clf.link_rewrite, '') AS link_rewrite
           FROM ps_category c
      LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
          WHERE c.id_category IN (${rootPlaceholders})`,
        rootIds,
      )
      const rootSlugMap = new Map<number, string>()
      for (const r of rootRows) if (r.link_rewrite) rootSlugMap.set(r.id_category, r.link_rewrite)
      for (const item of rootHrefNeeded) {
        const slug = rootSlugMap.get(item.psCategoryId!)
        if (slug) item.href = `/${slug}/`
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const productItems = [...byId.values()].filter(
      (i) => i.type === 'megamenu' && i.psProductId,
    )
    if (productItems.length > 0) {
      try {
        const productIds = [...new Set(productItems.map((i) => i.psProductId as number))]
        const cfg = useRuntimeConfig(event).public as any
        const cardAttrsRaw = cfg?.cardAttributes
        const cardAttrs: string[] = Array.isArray(cardAttrsRaw)
          ? cardAttrsRaw.filter(Boolean).map(String)
          : []

        const cards = await fetchProductCardsByIds(db, idLang, productIds, {
          tenant: db.clientId,
          clientId: db.clientId,
          event,
        })

        if (cards.length) {
          
          
          
          
          const idPh = productIds.map(() => '?').join(',')
          const extraRows = await db.query<{ id: number; reduction: any; dateAdd: any; rate: any }>(
            `SELECT p.id_product AS id, MAX(sp.reduction) AS reduction, p.date_add AS "dateAdd",
                    MAX(tax.rate) AS rate
               FROM ps_product p
          LEFT JOIN ps_product_shop psh ON psh.id_product = p.id_product AND psh.id_shop = 1
          LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = psh.id_tax_rules_group
                AND tr.id_country = ${TENANT_PG_FR_COUNTRY_ID}
          LEFT JOIN ps_tax tax ON tax.id_tax = tr.id_tax AND tax.active = 1
          LEFT JOIN ps_specific_price sp ON sp.id_product = p.id_product
                AND sp.reduction > 0
                AND (sp.from_quantity <= 1 OR sp.from_quantity IS NULL)
                AND (sp.id_product_attribute = 0 OR sp.id_product_attribute IS NULL)
                AND (sp."from" IS NULL OR sp."from" <= NOW())
                AND (sp."to"   IS NULL OR sp."to"   >= NOW())
              WHERE p.id_product IN (${idPh})
              GROUP BY p.id_product, p.date_add`,
            productIds,
          )
          const rowsById = new Map(
            extraRows.map((r) => [Number(r.id), { reduction: r.reduction, dateAdd: r.dateAdd }]),
          )
          const rateById = new Map<number, number>()
          for (const r of extraRows) {
            const rate = Number(r.rate || 0)
            if (rate > 0) rateById.set(Number(r.id), rate)
          }

          await applyTaxToCards(db, cards, rateById)

          const [attrsMap, badgesMap] = await Promise.all([
            cardAttrs.length
              ? computeCardAttributes(db, productIds, idLang, cardAttrs)
              : Promise.resolve(new Map<number, string[]>()),
            computeProductBadges(db, productIds, idLang, rowsById, cfg?.cardBadges, {
              promo: await t('catalogue.badge_promo', idLang, 'Promotion'),
              newLabel: await t('catalogue.badge_new', idLang, 'Nouveauté'),
            }),
          ])

          const cardById = new Map<number, MegamenuProductCard>()
          for (const c of cards) {
            const a = attrsMap.get(c.id)
            if (a) c.attributes = a
            const b = badgesMap.get(c.id)
            if (b && b.length) c.badges = b
            cardById.set(c.id, c)
          }
          
          
          
          for (const item of productItems) {
            const card = cardById.get(item.psProductId as number)
            if (card) item.product = card
          }
        }
      } catch (err: any) {
        console.error('[megamenu] carte produit non résolue:', err?.message)
      }
    }

    
    
    
    
    
    
    if (idLang !== 1) {
      const slugMap = await loadSiloSlugMapForLang(idLang)
      const blogCtx = await chargerContexteHrefsBlog(db, idLang)
      const loc = (href: string): string => (blogCtx && estHrefBlog(href))
        ? localiserHrefBlog(href, blogCtx)
        : (localizeSiloHref(href, slugMap) || href)
      const walk = (items: MegamenuItem[]) => {
        for (const it of items) {
          if (it.href) it.href = loc(it.href)
          if (it.psChildren?.length) {
            for (const pc of it.psChildren) {
              pc.href = loc(pc.href)
              if (pc.psChildren?.length) {
                for (const gc of pc.psChildren) {
                  gc.href = loc(gc.href)
                }
              }
            }
          }
          if (it.children.length) walk(it.children)
        }
      }
      walk(roots)
    }

    
    if (roots.length) lastGoodMega.set(cacheKey, roots)
    return { items: roots }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { items: [] }
    }
    console.error('[megamenu] DB error:', err?.message)
    
    
    const cached = lastGoodMega.get(cacheKey)
    if (cached) return { items: cached }
    throw createError({ statusCode: 500, message: 'Erreur chargement menu' })
  }
})
