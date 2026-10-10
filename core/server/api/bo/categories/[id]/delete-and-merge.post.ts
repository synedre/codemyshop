

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 2) {
    throw createError({ statusCode: 400, message: 'id catégorie invalide' })
  }
  const body = await readBody<{ target_category_id?: number; hard_delete?: boolean }>(event)
  const targetId = body?.target_category_id ? Number(body.target_category_id) : 0
  const hardDelete = !!body?.hard_delete

  const d = usePocPg()

  const catResult: any = await d.execute(sql`SELECT id_category FROM cs_main.ps_category WHERE id_category = ${id}`)
  const cat = ((catResult as any) as any[])[0]
  if (!cat) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  
  const defaultersRes: any = await d.execute(sql`
    SELECT p.id_product, COALESCE(pl.name, '') AS name
      FROM cs_main.ps_product p
      LEFT JOIN cs_main.ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
     WHERE p.active = 1 AND p.id_category_default = ${id}
     ORDER BY p.id_product
     LIMIT 50
  `)
  const defaulters = ((defaultersRes as any) as any[]) ?? []
  
  
  
  
  if (defaulters.length > 0 && (targetId === 0 || targetId === id)) {
    
    
    const siblingRes: any = await d.execute(sql`
      SELECT sib.id_category, COALESCE(sl.name, '') AS name, count(cp.id_product) AS n
        FROM cs_main.ps_category sib
        LEFT JOIN cs_main.ps_category_lang sl ON sl.id_category = sib.id_category AND sl.id_lang = 1
        LEFT JOIN cs_main.ps_category_product cp ON cp.id_category = sib.id_category
       WHERE sib.active = 1 AND sib.id_category <> ${id}
         AND sib.id_parent = (SELECT id_parent FROM cs_main.ps_category WHERE id_category = ${id})
       GROUP BY sib.id_category, sl.name
       ORDER BY n DESC
       LIMIT 1
    `)
    const sibling = ((siblingRes as any) as any[])?.[0]
    const names = defaulters.slice(0, 5).map((p: any) => p.name || `#${p.id_product}`).join(', ')
    const more = defaulters.length > 5 ? ` (+${defaulters.length - 5} autre(s))` : ''
    const suggestion = sibling ? ` Suggestion (sœur la plus peuplée, à valider — jamais automatique) : « ${sibling.name || `#${sibling.id_category}`} ».` : ''
    throw createError({
      statusCode: 409,
      message: `${defaulters.length} produit(s) ont cette catégorie comme catégorie PAR DÉFAUT (${names}${more}) — choisissez une catégorie cible pour les reloger avant de continuer.${suggestion}`,
      data: { affected_products: defaulters, suggestion: sibling || null },
    })
  }

  if (hardDelete) {
    const childrenResult: any = await d.execute(sql`
      SELECT COUNT(*) AS "n" FROM cs_main.ps_category WHERE id_parent = ${id} AND active = 1
    `)
    const childrenN = Number(((childrenResult as any) as any[])[0]?.n || 0)
    if (childrenN > 0) {
      throw createError({
        statusCode: 400,
        message: `Cette catégorie a ${childrenN} sous-catégorie(s) active(s). Désactivez-les ou changez leur parent avant la suppression définitive.`,
      })
    }
  }

  
  
  
  let migratedCount = 0
  if (targetId > 0 && targetId !== id) {
    const targetResult: any = await d.execute(sql`SELECT id_category FROM cs_main.ps_category WHERE id_category = ${targetId}`)
    const target = ((targetResult as any) as any[])[0]
    if (!target) throw createError({ statusCode: 400, message: 'Catégorie cible introuvable' })

    const insertRes: any = await d.execute(sql`
      INSERT INTO cs_main.ps_category_product (id_category, id_product, position)
      SELECT ${targetId}, cp.id_product, cp.position
        FROM cs_main.ps_category_product cp
       WHERE cp.id_category = ${id}
      ON CONFLICT (id_category, id_product) DO NOTHING
      RETURNING id_product
    `)
    migratedCount = Number((((insertRes as any) as any[]) ?? []).length)

    
    
    
    
    
    
    await d.execute(sql`
      UPDATE cs_main.ps_product SET id_category_default = ${targetId}, date_upd = now()
       WHERE id_category_default = ${id} AND active = 1
    `)
    await d.execute(sql`
      UPDATE cs_main.ps_product_shop SET id_category_default = ${targetId}
       WHERE id_category_default = ${id}
         AND id_product IN (SELECT id_product FROM cs_main.ps_product WHERE active = 1)
    `).catch(() => {})
  }

  
  
  const removedRes: any = await d.execute(sql`
    DELETE FROM cs_main.ps_category_product WHERE id_category = ${id}
    RETURNING id_product
  `)
  const removedAffected = Number((((removedRes as any) as any[]) ?? []).length)

  
  if (hardDelete) {
    
    const treeRes: any = await d.execute(sql`
      SELECT nleft, nright FROM cs_main.ps_category WHERE id_category = ${id}
    `)
    const treeNode = ((treeRes as any) as any[])[0]

    await d.execute(sql`DELETE FROM cs_main.ps_category_lang WHERE id_category = ${id}`)
    await d.execute(sql`DELETE FROM cs_main.ps_category_shop WHERE id_category = ${id}`)
    await d.execute(sql`DELETE FROM cs_main.ps_category_group WHERE id_category = ${id}`)
    await d.execute(sql`DELETE FROM cs_main.ps_category WHERE id_category = ${id}`)

    
    
    if (treeNode) {
      const nright = Number(treeNode.nright)
      const width = nright - Number(treeNode.nleft) + 1
      await d.execute(sql`UPDATE cs_main.ps_category SET nleft = nleft - ${width} WHERE nleft > ${nright}`)
      await d.execute(sql`UPDATE cs_main.ps_category SET nright = nright - ${width} WHERE nright > ${nright}`)
    }
  } else {
    
    await d.execute(sql`UPDATE cs_main.ps_category SET active = 0 WHERE id_category = ${id}`)
  }

  return {
    ok: true,
    id_category: id,
    target_category_id: targetId || null,
    migrated_products: migratedCount,
    removed_associations: removedAffected,
    deleted: hardDelete,
  }
})
