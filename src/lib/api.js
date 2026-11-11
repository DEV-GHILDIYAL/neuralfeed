import { supabase, isSupabaseConfigured } from './supabase.js'
import { MOCK_ARTICLES } from './mock.js'
import { dayRange, monthRange, toDayKey } from './dates.js'

export const PAGE_SIZE = 12

const LIST_COLUMNS =
  'id, slug, title, title_hi, summary, summary_hi, category, tags, image_url, source_name, published_at, ai_provider'

// ---------- Demo mode (no Supabase env yet) ----------
function mockFilter({ category, categories, search, tag, from, to }) {
  let rows = [...MOCK_ARTICLES]
  if (category) rows = rows.filter((a) => a.category === category)
  if (categories?.length) rows = rows.filter((a) => categories.includes(a.category))
  if (tag) rows = rows.filter((a) => a.tags.includes(tag))
  if (from) rows = rows.filter((a) => a.published_at >= from)
  if (to) rows = rows.filter((a) => a.published_at < to)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((a) => (a.title + ' ' + a.summary).toLowerCase().includes(q))
  }
  return rows.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
}

/**
 * Paginated list of articles.
 * Filters: category, categories[], search (full-text), tag, from/to (ISO, [from, to)).
 */
export async function getArticles({ category, categories, search, tag, from, to, page = 0, pageSize = PAGE_SIZE } = {}) {
  const start = page * pageSize
  if (!isSupabaseConfigured) {
    const rows = mockFilter({ category, categories, search, tag, from, to })
    return { data: rows.slice(start, start + pageSize), hasMore: rows.length > start + pageSize }
  }

  let query = supabase
    .from('articles')
    .select(LIST_COLUMNS)
    .order('published_at', { ascending: false })
    .range(start, start + pageSize) // one extra row tells us if there's more

  if (category) query = query.eq('category', category)
  if (categories?.length) query = query.in('category', categories)
  if (tag) query = query.contains('tags', [tag])
  if (from) query = query.gte('published_at', from)
  if (to) query = query.lt('published_at', to)
  if (search) query = query.textSearch('search', search, { type: 'websearch', config: 'english' })

  const { data, error } = await query
  if (error) throw error
  return { data: data.slice(0, pageSize), hasMore: data.length > pageSize }
}

/** Articles by id, returned in the same order as `ids` (used for bookmarks). */
export async function getArticlesByIds(ids) {
  if (!ids.length) return []
  let rows
  if (!isSupabaseConfigured) {
    rows = MOCK_ARTICLES.filter((a) => ids.includes(a.id))
  } else {
    const { data, error } = await supabase.from('articles').select(LIST_COLUMNS).in('id', ids.slice(0, 200))
    if (error) throw error
    rows = data
  }
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

/** All articles published on one local day (YYYY-MM-DD). */
export async function getArticlesForDay(dayKey) {
  const [from, to] = dayRange(dayKey)
  const { data } = await getArticles({ from, to, pageSize: 200 })
  return data
}

/** { 'YYYY-MM-DD': count } for one month — powers the calendar dots. */
export async function getDayCounts(year, month) {
  const [from, to] = monthRange(year, month)
  let rows
  if (!isSupabaseConfigured) {
    rows = mockFilter({ from, to })
  } else {
    const { data, error } = await supabase
      .from('articles')
      .select('published_at')
      .gte('published_at', from)
      .lt('published_at', to)
      .limit(5000)
    if (error) throw error
    rows = data
  }
  const counts = {}
  for (const r of rows) {
    const key = toDayKey(r.published_at)
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

/** Most frequent tags over the last `days` days. */
export async function getTrendingTags({ days = 3, limit = 14 } = {}) {
  const from = new Date(Date.now() - days * 86400_000).toISOString()
  let rows
  if (!isSupabaseConfigured) {
    rows = mockFilter({ from })
  } else {
    const { data, error } = await supabase.from('articles').select('tags').gte('published_at', from).limit(500)
    if (error) throw error
    rows = data
  }
  const counts = new Map()
  for (const r of rows) for (const t of r.tags || []) counts.set(t, (counts.get(t) || 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}

export async function getArticleBySlug(slug) {
  if (!isSupabaseConfigured) return MOCK_ARTICLES.find((a) => a.slug === slug) ?? null

  const { data, error } = await supabase
    .from('articles')
    .select(
      'id, slug, title, title_hi, summary, summary_hi, content, content_hi, key_points, key_points_hi, category, tags, image_url, source_name, source_url, published_at, ai_provider, ai_model',
    )
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Semantically related articles (pgvector); falls back to same-category if embeddings aren't there. */
export async function getRelated(article, limit = 5) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('related_articles', { article_id: article.id, match_count: limit })
    if (!error && data?.length) {
      // related_articles has no Hindi columns — fetch them in one go
      return getArticlesByIds(data.map((d) => d.id))
    }
  }
  const { data } = await getArticles({ category: article.category, pageSize: limit + 1 })
  return data.filter((a) => a.id !== article.id).slice(0, limit)
}

/** Other outlets that covered the same story. */
export async function getStorySources(articleId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('article_sources')
    .select('source_name, source_url, title')
    .eq('article_id', articleId)
    .order('similarity', { ascending: false })
  if (error) return []
  return data
}

/** AI model tracker rows, newest first. */
export async function getModels() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('ai_models')
    .select('id, name, company, release_type, modality, context_window, parameters, summary, announced_at, article:articles(slug, source_name)')
    .order('announced_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data
}

/** Ask NeuralFeed — server endpoint (api/ask.js) does retrieval + LLM. */
export async function askQuestion(question, lang) {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, lang }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}
