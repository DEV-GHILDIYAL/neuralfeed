import { SITE_URL, supabase } from './supabase'
import { dayRange, monthRange, toDayKey } from './dates'

export type Article = {
  id: string
  slug: string
  title: string
  title_hi?: string | null
  summary: string
  summary_hi?: string | null
  content?: string
  content_hi?: string | null
  key_points?: string[] | null
  key_points_hi?: string[] | null
  category: string
  tags?: string[] | null
  image_url?: string | null
  source_name: string
  source_url?: string
  published_at: string
  ai_provider?: string | null
}

export type AiModel = {
  id: number
  name: string
  company: string | null
  release_type: string
  modality: string | null
  context_window: string | null
  parameters: string | null
  summary: string | null
  announced_at: string
  article: { slug: string; source_name: string } | null
}

const LIST =
  'id, slug, title, title_hi, summary, summary_hi, category, tags, image_url, source_name, published_at'
export const PAGE = 15

type ListOpts = { page?: number; pageSize?: number; category?: string; categories?: string[]; search?: string; tag?: string; from?: string; to?: string; withPoints?: boolean }

export async function getArticles(opts: ListOpts = {}) {
  const { page = 0, pageSize = PAGE, category, categories, search, tag, from, to, withPoints } = opts
  const start = page * pageSize
  let q = supabase
    .from('articles')
    .select(withPoints ? `${LIST}, key_points, key_points_hi` : LIST)
    .order('published_at', { ascending: false })
    .range(start, start + pageSize)
  if (category) q = q.eq('category', category)
  if (categories?.length) q = q.in('category', categories)
  if (tag) q = q.contains('tags', [tag])
  if (from) q = q.gte('published_at', from)
  if (to) q = q.lt('published_at', to)
  if (search) q = q.textSearch('search', search, { type: 'websearch', config: 'english' })
  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as unknown as Article[]
  return { data: rows.slice(0, pageSize), hasMore: rows.length > pageSize }
}

export async function getArticle(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select(
      'id, slug, title, title_hi, summary, summary_hi, content, content_hi, key_points, key_points_hi, category, tags, image_url, source_name, source_url, published_at, ai_provider',
    )
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data as Article | null
}

export async function getArticlesByIds(ids: string[]) {
  if (!ids.length) return []
  const { data, error } = await supabase.from('articles').select(LIST).in('id', ids.slice(0, 200))
  if (error) throw error
  const byId = new Map((data as Article[]).map((a) => [a.id, a]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as Article[]
}

export async function getRelated(article: Article, limit = 5) {
  const { data, error } = await supabase.rpc('related_articles', { article_id: article.id, match_count: limit })
  if (!error && data?.length) return getArticlesByIds((data as { id: string }[]).map((d) => d.id))
  const { data: same } = await getArticles({ category: article.category, pageSize: limit + 1 })
  return same.filter((a) => a.id !== article.id).slice(0, limit)
}

export async function getStorySources(articleId: string) {
  const { data, error } = await supabase
    .from('article_sources')
    .select('source_name, source_url, title')
    .eq('article_id', articleId)
  if (error) return []
  return data as { source_name: string; source_url: string; title: string | null }[]
}

export async function getArticlesForDay(key: string) {
  const [from, to] = dayRange(key)
  return (await getArticles({ from, to, pageSize: 200 })).data
}

export async function getDayCounts(year: number, month: number) {
  const [from, to] = monthRange(year, month)
  const { data, error } = await supabase
    .from('articles')
    .select('published_at')
    .gte('published_at', from)
    .lt('published_at', to)
    .limit(5000)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const r of data as { published_at: string }[]) {
    const k = toDayKey(r.published_at)
    counts[k] = (counts[k] || 0) + 1
  }
  return counts
}

export async function getModels() {
  const { data, error } = await supabase
    .from('ai_models')
    .select('id, name, company, release_type, modality, context_window, parameters, summary, announced_at, article:articles(slug, source_name)')
    .order('announced_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data as unknown as AiModel[]
}

export type AskResult = { answer: string; sources: { slug: string; title: string; title_hi: string | null; source_name: string }[] }

export async function askQuestion(question: string, lang: 'en' | 'hi'): Promise<AskResult> {
  const res = await fetch(`${SITE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, lang }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

export const articleUrl = (slug: string) => `${SITE_URL}/article/${slug}`
