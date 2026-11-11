// SEO prerender — runs after `vite build`.
// The site is a React SPA, so crawlers and link previews (WhatsApp, X, Google) would see an empty page.
// This writes a real HTML file per route with the right <title>, meta description, Open Graph tags,
// JSON-LD and the article text, plus sitemap.xml, rss.xml and robots.txt.
// React then takes over in the browser as usual (createRoot replaces the static markup).
//
// Fresh articles appear after the next build — the GitHub Action triggers a Vercel rebuild after each news run.
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { CATEGORIES } from '../src/lib/categories.js'

const DIST = path.resolve('dist')
const SITE = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:4173'
).replace(/\/$/, '')
const NAME = 'NeuralFeed'
const DEFAULT_DESC =
  'Daily AI & tech news — new AI models, launches, gadgets, startups and security — summarized by AI from trusted sources.'

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pad = (n) => String(n).padStart(2, '0')
// Day pages are keyed in IST (the site's main audience); the browser re-renders in local time anyway.
const istDayKey = (iso) => {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function headTags({ title, description = DEFAULT_DESC, url, image, type = 'website', jsonLd, lang = 'en' }) {
  const full = title ? `${title} — ${NAME}` : `${NAME} — AI & tech news, daily`
  return [
    `<title>${esc(full)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${NAME}" href="${SITE}/rss.xml" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:title" content="${esc(full)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:locale" content="${lang === 'hi' ? 'hi_IN' : 'en_IN'}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

function render(template, head, body = '') {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

async function writePage(route, html) {
  const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route, 'index.html')
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, html)
}

function articleBody(a) {
  const paras = (a.content || '').split(/\n{2,}/).filter(Boolean)
  return `<article style="max-width:720px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif">
  <p><a href="/">NeuralFeed</a> / <a href="/category/${esc(a.category)}">${esc(a.category)}</a></p>
  <h1>${esc(a.title)}</h1>
  <p><strong>${esc(a.summary)}</strong></p>
  <p><time datetime="${esc(a.published_at)}">${esc(new Date(a.published_at).toUTCString())}</time> · Source: <a href="${esc(a.source_url)}" rel="noopener">${esc(a.source_name)}</a></p>
  ${(a.key_points || []).length ? `<ul>${a.key_points.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
  ${paras.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}
</article>`
}

async function fetchArticles() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('⚠ prerender: Supabase env not set — writing static routes only')
    return []
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const all = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('articles')
      .select('slug, title, summary, content, key_points, category, tags, image_url, source_name, source_url, published_at')
      .order('published_at', { ascending: false })
      .range(from, from + 999)
    if (error) throw new Error(`prerender: ${error.message}`)
    all.push(...data)
    if (data.length < 1000) break
  }
  return all
}

async function main() {
  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')
  const articles = await fetchArticles()
  const urls = [] // for sitemap: [loc, lastmod]

  // Home
  await writePage(
    '/',
    render(
      template,
      headTags({
        url: `${SITE}/`,
        jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE, inLanguage: ['en', 'hi'] },
      }),
    ),
  )
  urls.push([`${SITE}/`, articles[0]?.published_at])

  // Static pages
  const statics = [
    ['/models', 'AI Model Tracker', 'Every new AI model launch spotted in the news — LLMs, open-weight models, image, video and code models.'],
    ['/ask', 'Ask NeuralFeed', 'Ask questions about recent AI & tech news and get answers with sources.'],
    ['/for-you', 'For You', DEFAULT_DESC],
  ]
  for (const [route, title, description] of statics) {
    await writePage(route, render(template, headTags({ title, description, url: `${SITE}${route}` })))
    if (route !== '/for-you') urls.push([`${SITE}${route}`])
  }

  // Categories
  for (const c of CATEGORIES) {
    const route = `/category/${c.slug}`
    const latest = articles.find((a) => a.category === c.slug)
    await writePage(
      route,
      render(template, headTags({ title: `${c.label} news`, description: `Latest ${c.label} news: ${c.hint}.`, url: `${SITE}${route}`, image: latest?.image_url })),
    )
    urls.push([`${SITE}${route}`, latest?.published_at])
  }

  // Day archive pages
  const days = new Map()
  for (const a of articles) {
    const k = istDayKey(a.published_at)
    if (!days.has(k)) days.set(k, a)
  }
  for (const [day, first] of days) {
    const route = `/date/${day}`
    const pretty = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    await writePage(
      route,
      render(template, headTags({ title: `AI & tech news — ${pretty}`, description: `All AI and technology stories from ${pretty}.`, url: `${SITE}${route}`, image: first.image_url })),
    )
    urls.push([`${SITE}${route}`, first.published_at])
  }

  // Articles
  for (const a of articles) {
    const route = `/article/${a.slug}`
    const url = `${SITE}${route}`
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: a.title.slice(0, 110),
      description: a.summary,
      datePublished: a.published_at,
      dateModified: a.published_at,
      image: a.image_url ? [a.image_url] : undefined,
      articleSection: a.category,
      keywords: (a.tags || []).join(', '),
      mainEntityOfPage: url,
      isBasedOn: a.source_url,
      publisher: { '@type': 'Organization', name: NAME, url: SITE },
      author: { '@type': 'Organization', name: NAME },
    }
    await writePage(
      route,
      render(template, headTags({ title: a.title, description: a.summary, url, image: a.image_url, type: 'article', jsonLd }), articleBody(a)),
    )
    urls.push([url, a.published_at])
  }

  // sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, mod]) => `  <url><loc>${esc(loc)}</loc>${mod ? `<lastmod>${new Date(mod).toISOString()}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap)

  // rss.xml (latest 50)
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${NAME} — AI &amp; tech news</title>
  <link>${SITE}/</link>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
  <description>${esc(DEFAULT_DESC)}</description>
  <language>en-in</language>
${articles
  .slice(0, 50)
  .map(
    (a) => `  <item>
    <title>${esc(a.title)}</title>
    <link>${SITE}/article/${esc(a.slug)}</link>
    <guid isPermaLink="true">${SITE}/article/${esc(a.slug)}</guid>
    <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
    <category>${esc(a.category)}</category>
    <description>${esc(a.summary)}</description>${a.image_url ? `\n    <enclosure url="${esc(a.image_url)}" type="image/jpeg" length="0" />` : ''}
  </item>`,
  )
  .join('\n')}
</channel>
</rss>
`
  await fs.writeFile(path.join(DIST, 'rss.xml'), rss)
  await fs.writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`)

  console.log(`✅ prerender: ${articles.length} articles, ${days.size} days, ${urls.length} URLs → sitemap.xml, rss.xml, robots.txt (site: ${SITE})`)
}

main().catch((e) => {
  console.error('💥', e.message)
  process.exit(1)
})
