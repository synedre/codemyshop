

import { resolveIdLang, langPrefixFor } from '~/server/utils/lang'
import { getProductUrl } from '~/server/utils/product-url'

export default defineEventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id || isNaN(id)) return { found: false }

  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  try {
    
    const nameRow = await db.get<{ name: string }>(
      `SELECT COALESCE(pl.name, plf.name, '') AS name
         FROM ps_product p
    LEFT JOIN ps_product_lang pl  ON pl.id_product = p.id_product AND pl.id_lang = ? AND pl.id_shop = 1
    LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
        WHERE p.id_product = ? AND p.active = 1
        LIMIT 1`,
      [idLang, id],
    )
    if (!nameRow) return { found: false }

    
    
    const langRow = await db.get<{ iso_code: string }>(
      `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`,
      [idLang],
    )
    const iso = langRow?.iso_code || 'fr'
    const langPrefix = langPrefixFor(event, iso)

    const url = await getProductUrl(db, id, idLang, { event, iso, langPrefix })
    return { found: true, path: url, name: nameRow.name }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { found: false }
    throw err
  }
})
