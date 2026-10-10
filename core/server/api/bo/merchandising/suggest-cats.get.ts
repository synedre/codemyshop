

import { useClientDb } from '~/server/utils/db'
import { spawn } from 'node:child_process'

import { requireEmployeeSession } from '~/server/utils/session'
import { loadBrandBrief } from '~/server/utils/brand-brief'
import { importFallbackCategory } from '~/server/utils/import-fallback-category'
import { productPromptContext } from '~/utils/product-prompt-context'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const { id_product } = getQuery(event)
  const idProduct = Number(id_product)
  if (!idProduct) {
    throw createError({ statusCode: 400, message: 'id_product requis' })
  }

  const db = useClientDb(event)

  
  const prod = await db.get<{ id_product: number; name: string; description_short: string | null }>(
    `SELECT p.id_product, pl.name, pl.description_short
       FROM ps_product p JOIN ps_product_lang pl ON pl.id_product = p.id_product
                                                 AND pl.id_lang = 1 AND pl.id_shop = 1
      WHERE p.id_product = ? AND p.active = 1`,
    [idProduct],
  )
  if (!prod) {
    throw createError({ statusCode: 404, message: 'Produit introuvable' })
  }

  
  const homeId = await importFallbackCategory(db)
  const cats = await db.query<{ id_category: number; silo_path: string }>(`
    WITH RECURSIVE tree AS (
      SELECT c.id_category, c.id_parent, cl.link_rewrite, 0 AS depth, cl.link_rewrite AS path
        FROM ps_category c
        JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
       WHERE c.id_parent = ? AND c.active = 1
      UNION ALL
      SELECT c.id_category, c.id_parent, cl.link_rewrite, t.depth + 1, CONCAT(t.path, '/', cl.link_rewrite)
        FROM ps_category c
        JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
        JOIN tree t ON c.id_parent = t.id_category
       WHERE c.active = 1
    )
    SELECT t.id_category, t.path AS silo_path
      FROM tree t
     WHERE t.depth > 0
       AND NOT EXISTS (SELECT 1 FROM ps_category c2 WHERE c2.id_parent = t.id_category AND c2.active = 1)
     ORDER BY silo_path
  `, [homeId])

  if (!cats.length) return { ok: true, suggestions: [] }

  const catsBlock = cats.map(c => `${c.id_category} → ${c.silo_path}`).join('\n')
  const desc = (prod.description_short || '').replace(/<[^>]+>/g, '').slice(0, 300)

  
  const shop = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`,
  ).catch(() => null)
  const brief = await loadBrandBrief()
  const context = productPromptContext({
    shopName: shop?.value, audience: brief.audience, sectorTopics: brief.sector_topics,
  }, 'classement')

  const prompt = `${context}

PRODUIT À CLASSER :
- Nom : ${prod.name}
- Description : ${desc || '(vide)'}

CATÉGORIES DISPONIBLES (id → path) :
${catsBlock}

TÂCHE : choisir 1 à 3 catégories où ce produit appartient PRINCIPALEMENT (pas où il contient un ingrédient).

DISCERNEMENT : classe selon ce QU'EST le produit, pas selon un composant, un ingrédient ou un accessoire qu'il contient ou mentionne. Préfère la catégorie la plus précise (feuille).

FORMAT RÉPONSE : array JSON pur (PAS de markdown), MAX 3 entrées, ordonnées de la plus pertinente à la moins :
[{"id_category": int, "silo_path": "string", "reason": "5-10 mots"}]
`

  
  const claudeBin = process.env.CLAUDE_BIN || 'claude'
  const result = await new Promise<string>((resolve, reject) => {
    const proc = spawn(claudeBin, ['-p', prompt], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', d => { stdout += String(d) })
    proc.stderr.on('data', d => { stderr += String(d) })
    proc.on('close', code => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`claude exit ${code}: ${stderr.slice(0, 200)}`))
    })
    setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('claude timeout')) }, 60_000)
  })

  let raw = result.trim()
  if (raw.startsWith('```')) {
    const parts = raw.split('```')
    if (parts.length >= 2) raw = parts[1].replace(/^json\s*/i, '').trim()
  }
  let arr: any[] = []
  try {
    arr = JSON.parse(raw)
  } catch {
    const m = raw.match(/\[[\s\S]*\]/)
    if (m) try { arr = JSON.parse(m[0]) } catch {}
  }

  return {
    ok: true,
    suggestions: arr.slice(0, 3).map((it: any) => ({
      id_category: Number(it.id_category) || 0,
      silo_path: String(it.silo_path || ''),
      reason: String(it.reason || ''),
    })).filter((it: any) => it.id_category > 0),
  }
})
