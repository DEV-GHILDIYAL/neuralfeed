import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 20_000,
  headers: { 'User-Agent': 'NeuralFeedBot/0.1 (+RSS reader)' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

export function stripHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

// Image URLs from RSS/HTML attributes often still contain "&amp;" — decode before storing.
const decodeUrlEntities = (u) => u.replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').trim()

function pickImage(item) {
  const fromMedia = (arr) => arr?.map((m) => m?.$?.url).find(Boolean)
  const candidates = [
    fromMedia(item.mediaContent),
    fromMedia(item.mediaThumbnail),
    item.enclosure?.type?.startsWith('image') ? item.enclosure.url : undefined,
    item.enclosure?.url && /\.(jpe?g|png|webp)/i.test(item.enclosure.url) ? item.enclosure.url : undefined,
    (item.contentEncoded || item.content || '').match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
  ]
  const url = candidates.find((u) => u && /^https?:\/\//.test(u))
  return url ? decodeUrlEntities(url) : null
}

/** Fetch one feed → normalized items. Never throws; returns [] on failure. */
export async function fetchFeed(feed, { maxAgeHours = 36 } = {}) {
  try {
    const parsed = await parser.parseURL(feed.url)
    const cutoff = Date.now() - maxAgeHours * 3600_000
    return parsed.items
      .map((item) => {
        let published = new Date(item.isoDate || item.pubDate || Date.now())
        // Some feeds (e.g. OpenAI) publish date-only or future timestamps — never allow a future date.
        if (published.getTime() > Date.now()) published = new Date()
        const text = stripHtml(item.contentEncoded || item.content || item.contentSnippet || item.summary || '')
        return {
          title: stripHtml(item.title || ''),
          link: item.link?.trim(),
          text: text.slice(0, 4000),
          image: pickImage(item),
          publishedAt: isNaN(published) ? new Date() : published,
          sourceName: feed.name,
          categoryHint: feed.category,
        }
      })
      .filter((i) => i.title && i.link && i.publishedAt.getTime() >= cutoff)
  } catch (err) {
    console.warn(`  ⚠ feed failed: ${feed.name} — ${err.message}`)
    return []
  }
}

function metaContent(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return tag?.match(/content=["']([^"']+)["']/i)?.[1]
}

/**
 * RSS snippets are often 1–2 lines. Fetch the article page and pull the paragraph
 * text (+ og:image) so the AI has real facts to work with. Best-effort: on any
 * failure the item is returned unchanged.
 */
export async function enrichItem(item, { minChars = 600 } = {}) {
  if (item.text.length >= minChars && item.image) return item
  try {
    const res = await fetch(item.link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NeuralFeedBot/0.1)' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    })
    if (!res.ok) return item
    const html = await res.text()

    const scope = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html
    const paragraphs = [...scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter((p) => p.length > 60 && !/cookie|subscribe|newsletter|sign up|advertisement/i.test(p))
    const body = paragraphs.join('\n').slice(0, 5000)

    const ogImage = metaContent(html, 'og:image')
    return {
      ...item,
      text: body.length > item.text.length ? body : item.text,
      image: item.image || (ogImage?.startsWith('http') ? decodeUrlEntities(ogImage) : null),
    }
  } catch {
    return item
  }
}
