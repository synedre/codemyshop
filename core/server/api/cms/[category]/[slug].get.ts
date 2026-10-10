

import { stripHtml, decodeHtmlEntities } from '~/server/utils/ps'
import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'
import { getAuthorByCmsId } from '~/internal/employeeextra/server/utils/employeeextra'
import { loadBlogArticleAlternates } from '~/server/utils/blog-article-alternates'
import { loadBlogTree, blogBranchIds, type BlogTree } from '~/server/utils/blog-tree'
import { resolveBlogCategoryByPath, blogRelativePath, blogArticleCanonicalInnerPath } from '~/server/utils/blog-path'
import { blogCategoryNames } from '~/server/utils/blog-category-names'
import { toIsoDateTime } from '~/server/utils/pg-date'
import { loadValidVisuals } from '~/server/utils/article-visual'

const _extraColsCache = new Map<string, string[]>()

async function getCmsExtraCols(db: any): Promise<string[]> {
  const key = String((db as any).clientId ?? '_default')
  const cached = _extraColsCache.get(key)
  if (cached) return cached
  let cols: string[] = []
  try {
    const r = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'cs_cms_extra'`,
    )
    cols = (r as any[]).map((c: any) => String(c.column_name ?? c.Field ?? ''))
  } catch {  }
  _extraColsCache.set(key, cols)
  return cols
}

function aUnCorpsPropre(ligne: { content?: unknown } | null | undefined): boolean {
  return String(ligne?.content ?? '').trim() !== ''
}

async function resolveMentorForArticle(opts: {
  category: string; subcategory: string; slug: string; linkRewrite: string; event: any
}): Promise<any> {
  const { category, subcategory, slug, linkRewrite, event } = opts
  const mentorKey = resolveMentor(category, subcategory)
  if (!mentorKey) return null
  const { getAllModulesAsync } = await import('~/server/utils/academy-content')
  const academy = await getAllModulesAsync()
  const articleUrl = `/blog/${category}/${slug}`
  const relatedMod = academy.modules?.find((mod: any) =>
    mod.relatedArticles?.some((entry: any) => {
      const url = typeof entry === 'string' ? entry : entry?.url || ''
      return url.includes(linkRewrite) || url === articleUrl
    })
  )
  const fallbackMod = academy.modules?.find((mod: any) => mod.mentor === mentorKey)
  const mod = relatedMod ?? fallbackMod
  const effectiveMentorKey = relatedMod ? relatedMod.mentor : mentorKey
  if (!mod) return null
  const { findMentorQuoteByModule } = await import('~/internal/academy/server/utils/academy')
  const q = await findMentorQuoteByModule(mod.slug, effectiveMentorKey, { event }).catch(() => null)
  if (!q) return null
  return {
    key: effectiveMentorKey,
    name: effectiveMentorKey,
    title: '',
    quote: q.quote,
    quoteSource: q.source || '',
    domain: '',
    academySlug: mod.slug,
  }
}

export default defineEventHandler(async (event) => {
  const category = getRouterParam(event, 'category') ?? ''
  const slug     = getRouterParam(event, 'slug') ?? ''
  const linkRewrite = category ? `${category}--${slug}` : slug

  try {
    const db = useClientDb(event)
    const idLang = await resolveIdLang(event)

    
    
    const extraCols = await getCmsExtraCols(db)

    const hasExtra = extraCols.includes('date_published')
    const hasAudio = extraCols.includes('audio_enabled')

    
    
    
    
    
    
    
    
    
    const extraSelect = hasExtra
      ? `COALESCE(ex.date_published, c.date_add) as date_published, COALESCE(ex.date_updated, c.date_upd) as date_updated,`
      : `c.date_add as date_published, c.date_upd as date_updated,`
    const audioSelect = hasAudio
      ? `COALESCE(ex.audio_enabled, 0) as audio_enabled, COALESCE(ex.audio_url, '') as audio_url`
      : `0 as audio_enabled, '' as audio_url`
    const joinClause = hasExtra
      ? `LEFT JOIN cs_cms_extra ex ON ex.id_cms = c.id_cms`
      : ''

    const sql = `SELECT c.id_cms, c.id_cms_category, c.indexation, cl.meta_title, cl.head_seo_title, cl.meta_description, cl.content, cl.link_rewrite,
               ${extraSelect}
               ${audioSelect}
         FROM ps_cms c
         JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
         ${joinClause}
         WHERE c.active = 1 AND cl.link_rewrite = ?`

    const rows = await db.query(sql, [idLang, linkRewrite])

    let item = rows[0]

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    let idCatArbre: number | null = null
    let segmentFinal = ''
    
    
    let arbreBlog: BlogTree | null = null
    if (!item && category) {
      const morceaux = String(slug).split('--').filter(Boolean)
      const segment = morceaux[morceaux.length - 1] || ''
      const cheminCategorie = [category, ...morceaux.slice(0, -1)]
      segmentFinal = segment

      if (segment) {
        arbreBlog = await loadBlogTree(db, idLang)
        const { tree, rootId } = arbreBlog
        const idCat = rootId === null
          ? null
          : resolveBlogCategoryByPath(tree, rootId, cheminCategorie)
        idCatArbre = idCat

        if (idCat !== null && rootId !== null) {
          
          
          
          
          
          
          const relCat = blogRelativePath(tree, rootId, idCat)
          const branche = relCat === null ? [idCat] : blogBranchIds(tree, rootId, relCat)
          const idsBranche = branche.length ? branche : [idCat]
          
          
          const parArbre = await db.query(
            `SELECT c.id_cms, c.id_cms_category, c.indexation, cl.meta_title, cl.head_seo_title, cl.meta_description, cl.content, cl.link_rewrite,
                    ${extraSelect}
                    ${audioSelect}
               FROM ps_cms c
               JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
          LEFT JOIN ps_cms_lang clf ON clf.id_cms = c.id_cms AND clf.id_lang = 1
               ${joinClause}
              WHERE c.active = 1
                AND c.id_cms_category IN (${idsBranche.map(() => '?').join(', ')})
                AND (
                  COALESCE(NULLIF(cl.link_rewrite, ''), clf.link_rewrite) = ?
                  OR COALESCE(NULLIF(cl.link_rewrite, ''), clf.link_rewrite) LIKE ?
                )
              ORDER BY CASE WHEN c.id_cms_category = ? THEN 0 ELSE 1 END, c.id_cms
              LIMIT 1`,
            [idLang, ...idsBranche, segment, `%--${segment}`, idCat],
          )
          item = parArbre[0]
        }
      }
    }

    
    
    
    if (item && idLang !== 1 && !aUnCorpsPropre(item)) item = undefined

    
    
    
    
    
    
    
    
    
    let redirectSlug: string | null = null
    if (!item && idLang !== 1) {
      const frRows = await db.query(
        `SELECT c.id_cms, c.id_cms_category, c.indexation, cl.meta_title, cl.head_seo_title, cl.meta_description, cl.content, cl.link_rewrite,
                ${extraSelect}
                ${audioSelect}
           FROM ps_cms c
           JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
           ${joinClause}
          WHERE c.active = 1 AND cl.link_rewrite = ?`,
        [linkRewrite],
      )
      let frItem = frRows[0]
      
      
      
      
      
      
      if (!frItem && idCatArbre !== null && segmentFinal) {
        const parSegment = await db.query(
          `SELECT c.id_cms, c.id_cms_category, c.indexation, cl.meta_title, cl.head_seo_title, cl.meta_description, cl.content, cl.link_rewrite,
                  ${extraSelect}
                  ${audioSelect}
             FROM ps_cms c
             JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
             ${joinClause}
            WHERE c.active = 1 AND c.id_cms_category = ?
              AND (cl.link_rewrite = ? OR cl.link_rewrite LIKE ?)
            LIMIT 1`,
          [idCatArbre, segmentFinal, `%--${segmentFinal}`],
        )
        frItem = parSegment[0]
      }
      if (frItem) {
        const ownRows = await db.query(
          `SELECT link_rewrite, content FROM ps_cms_lang WHERE id_cms = ? AND id_lang = ?`,
          [frItem.id_cms, idLang],
        )
        const ownSlug = ownRows[0]?.link_rewrite as string | undefined
        
        
        if (ownSlug && ownSlug !== linkRewrite && aUnCorpsPropre(ownRows[0])) {
          redirectSlug = ownSlug.split('--').pop() || null
        }
      }
    }

    if (redirectSlug) {
      return { found: false, redirectSlug }
    }
    if (!item) {
      throw createError({ statusCode: 404, message: 'Article introuvable' })
    }

    const rawContent = item.content || ''

    
    const slugParts = slug.split('--')
    const subcategory = slugParts.length >= 2 ? slugParts[0] : ''

    
    const coverMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/)
    let coverImage = coverMatch ? coverMatch[1] : ''

    
    
    
    
    
    
    
    
    
    const i18nPublic = useRuntimeConfig().public as any
    const [coverFromQueue, faqDbItems, mentor, author, alternates, arbreCanonique, visuels] = await Promise.all([
      coverImage
        ? Promise.resolve<string | null>(null)
        : db.query(
            `SELECT cover_url FROM cs_covergen_queue WHERE id_cms = ? AND status = 'done' ORDER BY id_covergen DESC LIMIT 1`,
            [item.id_cms],
          ).then((r: any[]) => (r?.[0]?.cover_url as string) ?? null).catch(() => null),
      listFaqsByParent('cms', Number(item.id_cms), idLang, { event }).catch(() => [] as any[]),
      resolveMentorForArticle({ category, subcategory, slug, linkRewrite, event }).catch(() => null),
      getAuthorByCmsId(Number(item.id_cms), { event, idLang }).catch(() => null),
      loadBlogArticleAlternates(db, Number(item.id_cms), {
        defaultLocale: String(i18nPublic.i18nDefaultLocale || 'fr'),
        locales: (i18nPublic.i18nLocales as string[]) || [],
      }).catch(() => ({ paths: {}, langsWithContent: [] })),
      
      
      arbreBlog
        ? Promise.resolve<BlogTree | null>(arbreBlog)
        : loadBlogTree(db, idLang).catch(() => null),
      
      
      
      loadValidVisuals(db, Number(item.id_cms), idLang),
    ])
    if (!coverImage && coverFromQueue) coverImage = coverFromQueue

    
    const bodyContent = (() => {
      if (!coverImage) return rawContent
      const esc = coverImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return rawContent
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>\s*/gi, (m: string) => m.includes(coverImage) ? '' : m)
        .replace(new RegExp(`<img[^>]+src=["']${esc}["'][^>]*/?>\\s*`, 'gi'), '')
    })()

    
    
    const faq: { q: string; a: string }[] = []
    let contentClean = bodyContent

    
    for (const it of (faqDbItems as any[])) {
      if (it?.question) faq.push({ q: it.question, a: it.answer })
    }

    
    if (!faq.length) {
      
      const faqMatchA = bodyContent.match(/<h2[^>]*>\s*Questions\s+fr[eé\u00e9](?:&eacute;)?quentes\s*<\/h2>\s*<dl>([\s\S]*?)<\/dl>/i)
      if (faqMatchA) {
        contentClean = bodyContent.replace(faqMatchA[0], '').trim()
        for (const m of faqMatchA[1].matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)) {
          faq.push({ q: decodeHtmlEntities(stripHtml(m[1]).trim()), a: decodeHtmlEntities(stripHtml(m[2]).trim()) })
        }
      }

      
      if (!faq.length) {
        const faqMatchB = bodyContent.match(/<div[^>]*class="[^"]*faq-section[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*$/i)
          ?? bodyContent.match(/<div[^>]*class="[^"]*faq-section[^"]*"[^>]*>([\s\S]*?)$/i)
        if (faqMatchB) {
          contentClean = bodyContent.replace(faqMatchB[0], '').trim()
          for (const m of faqMatchB[1].matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*>([\s\S]*?)<\/div>/gi)) {
            faq.push({ q: decodeHtmlEntities(stripHtml(m[1]).trim()), a: decodeHtmlEntities(stripHtml(m[2]).trim()) })
          }
        }
      }

      
      if (!faq.length) {
        const faqMatchC = bodyContent.match(/<h2[^>]*>\s*FAQ[^<]*<\/h2>([\s\S]*)$/i)
        if (faqMatchC) {
          contentClean = bodyContent.replace(faqMatchC[0], '').trim()
          for (const m of faqMatchC[1].matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)) {
            faq.push({ q: decodeHtmlEntities(stripHtml(m[1]).trim()), a: m[2].trim() })
          }
        }
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    if (faq.length && contentClean === bodyContent) {
      contentClean = bodyContent
        .replace(/<h2[^>]*>\s*FAQ[^<]*<\/h2>[\s\S]*?(?=<h2|$)/i, '')
        .replace(/<h2[^>]*>\s*Questions\s+fr[eé\u00e9](?:&eacute;)?quentes[^<]*<\/h2>[\s\S]*?(?=<h2|$)/i, '')
        .trim()
    }

    const wordCount = stripHtml(contentClean).split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.round(wordCount / 200))
    const thumbnailImage = coverImage ? coverImage.replace(/\/cover-/, '/thumb-') : ''

    

    
    
    
    
    
    const canonicalInnerPath = arbreCanonique
      ? blogArticleCanonicalInnerPath(
          arbreCanonique.tree,
          arbreCanonique.rootId,
          Number(item.id_cms_category),
          String(item.link_rewrite || ''),
        )
      : null

    
    
    const { categoryName, pillarName } = blogCategoryNames(
      arbreCanonique?.tree,
      arbreCanonique?.rootId ?? null,
      Number(item.id_cms_category),
    )

    return {
      id: item.id_cms,
      canonicalInnerPath,
      
      
      
      indexable: Number(item.indexation ?? 1) !== 0,
      title: item.meta_title || '',
      
      
      
      
      
      
      
      
      h1: item.head_seo_title || item.meta_title || '',
      category,
      categoryName,
      pillarName,
      subcategory,
      slug,
      coverImage,
      thumbnailImage,
      content: contentClean,
      visuels,
      faq,
      metaDescription: item.meta_description || '',
      active: true,
      datePublished: toIsoDateTime(item.date_published),
      dateUpdated: toIsoDateTime(item.date_updated),
      readingTime,
      mentor,
      
      
      
      alternates: alternates.paths,
      langsWithContent: alternates.langsWithContent,
      audioEnabled: !!Number(item.audio_enabled),
      audioUrl: item.audio_url || '',
      author: author ? {
        id: Number(author.id),
        slug: author.slug,
        name: author.displayName,
        firstname: author.firstname,
        lastname: author.lastname,
        title: author.expertise || '',
        bio: author.bio || '',
        image: author.photoUrl || '',
        linkedinUrl: author.linkedinUrl || '',
        url: author.slug ? `/auteur/${author.slug}` : '',
      } : null,
    }
  } catch (err: any) {
    if (err.statusCode === 404) throw err
    console.error('[API cms/slug] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur serveur' })
  }
})

const CATEGORY_MENTOR: Record<string, string> = {
  'prestashop/architecture': 'descartes',
  'prestashop/developpement': 'descartes',
  'prestashop/performance': 'aristote',
  'prestashop': 'descartes',
  'strategie/flywheel': 'machiavel',
  'strategie/positionnement': 'sun-tzu',
  'strategie': 'machiavel',
  'strategie/intelligence-artificielle': 'socrate',
  'seo/intelligence-artificielle': 'vinci',
  'seo': 'aristote',
  'devops/docker': 'kant',
  'devops': 'kant',
}

function resolveMentor(cat: string, subcat: string): string | null {
  return CATEGORY_MENTOR[`${cat}/${subcat}`] ?? CATEGORY_MENTOR[cat] ?? null
}
