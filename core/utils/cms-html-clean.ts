

const LEGACY_CLASSES = /\b(col-(?:xs|sm|md|lg)-\d+|col-\d+|row|page-heading|page-subheading|bottom-indent|category-description|category-view|category-cms|cms-block|std|dark|page-content|cms-content)\b/g

function mapTextOutsideLinks(html: string, transform: (text: string) => string): string {
  const TAG = /<[^>]*>/g
  let out = ''
  let cursor = 0
  let anchorDepth = 0
  let match: RegExpExecArray | null

  while ((match = TAG.exec(html)) !== null) {
    const text = html.slice(cursor, match.index)
    out += anchorDepth > 0 ? text : transform(text)

    const tag = match[0]
    if (/^<a\b/i.test(tag)) anchorDepth++
    else if (/^<\/a\s*>/i.test(tag)) anchorDepth = Math.max(0, anchorDepth - 1)
    out += tag
    cursor = match.index + tag.length
  }

  const tail = html.slice(cursor)
  return out + (anchorDepth > 0 ? tail : transform(tail))
}

export function cleanLegacyCmsHtml(html: string): string {
  if (!html) return ''
  let out = html

  out = out.replace(/\s+style\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+style\s*=\s*'[^']*'/gi, '')

  out = out.replace(/<font\b[^>]*>([\s\S]*?)<\/font>/gi, '$1')

  out = out.replace(/\s+class\s*=\s*"([^"]*)"/gi, (_match, classes) => {
    const cleaned = String(classes).replace(LEGACY_CLASSES, '').trim().replace(/\s+/g, ' ')
    return cleaned ? ` class="${cleaned}"` : ''
  })

  out = out.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, '<h2$1>$2</h2>')

  out = out.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
  out = out.replace(/<div\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>/gi, '')

  out = out.replace(/(<br\s*\/?>\s*){3,}/gi, '<br />')

  out = mapTextOutsideLinks(out, (text) =>
    text.replace(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, (email) => `<a href="mailto:${email}">${email}</a>`),
  )

  out = mapTextOutsideLinks(out, (text) =>
    text.replace(/(?<!\d)(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/g, (phone) => {
      const tel = phone.replace(/[\s.-]/g, '').replace(/^0/, '+33')
      return `<a href="tel:${tel}">${phone}</a>`
    }),
  )

  return out.trim()
}
