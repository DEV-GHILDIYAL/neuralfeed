// POST /api/ask  { question, lang }  →  { answer, sources[] }
// "Ask NeuralFeed": retrieval-augmented answers over the site's own articles.
//   1. embed the question (Gemini)  2. pgvector search (match_articles)  3. LLM answers ONLY from those articles.
// Runs as a Vercel serverless function; in `npm run dev` it is mounted by the Vite plugin in vite.config.js.
// Uses only the public anon Supabase key (read-only) — AI keys stay server-side.

import { createClient } from '@supabase/supabase-js'
import { createAIClient } from '../pipeline/providers/index.js'
import { embedOne, toPgVector } from '../pipeline/embeddings.js'

const MAX_Q = 300
const hits = new Map() // naive per-instance rate limit: ip → timestamps

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body // Vercel pre-parses JSON
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 8 // 8 questions / minute / IP
}

const SYSTEM = (lang) => `You are "Ask NeuralFeed", an assistant for a tech & AI news website.
Answer the user's question using ONLY the numbered news articles provided. Rules:
- Cite every fact with the article number in square brackets, e.g. [1] or [2][3].
- If the articles don't contain the answer, say so plainly and briefly — never use outside knowledge or guess.
- Be concise: 2–6 sentences, or a short bullet list when listing several items.
- Plain text only (no markdown headings, no bold).
- ${lang === 'hi' ? 'Reply in simple Hindi (Devanagari); keep company/product/model names in English.' : 'Reply in English.'}`

export default async function handler(req, res) {
  // CORS: the mobile app's web build and other front-ends call this from another origin.
  // Native iOS/Android fetch ignores CORS. The endpoint is public and rate-limited anyway.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim()
  if (rateLimited(ip)) return send(res, 429, { error: 'Too many questions — please wait a minute.' })

  let body
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: 'Invalid JSON' })
  }
  const question = String(body.question || '').trim().slice(0, MAX_Q)
  const lang = body.lang === 'hi' ? 'hi' : 'en'
  if (question.length < 3) return send(res, 400, { error: 'Question is too short' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !anon || !process.env.GEMINI_API_KEY) {
    return send(res, 503, { error: 'Ask is not configured on this server.' })
  }

  try {
    const supabase = createClient(url, anon, { auth: { persistSession: false } })

    // 1–2. Retrieve the most relevant articles
    const vector = await embedOne(question)
    const { data: matches, error } = await supabase.rpc('match_articles', {
      query_embedding: toPgVector(vector),
      match_count: 6,
      min_similarity: 0.45,
    })
    if (error) throw new Error(`search: ${error.message}`)

    if (!matches?.length) {
      return send(res, 200, {
        answer:
          lang === 'hi'
            ? 'माफ़ कीजिए, इस सवाल से जुड़ी कोई खबर NeuralFeed पर नहीं मिली।'
            : "Sorry — I couldn't find any NeuralFeed articles about that.",
        sources: [],
      })
    }

    // Hindi titles for the source list
    const { data: hiRows } = await supabase.from('articles').select('id, title_hi').in('id', matches.map((m) => m.id))
    const hiById = new Map((hiRows || []).map((r) => [r.id, r.title_hi]))

    const context = matches
      .map(
        (m, i) =>
          `[${i + 1}] ${m.title}\nSource: ${m.source_name} · ${new Date(m.published_at).toDateString()}\n${m.summary}\n${m.content.slice(0, 1200)}`,
      )
      .join('\n\n---\n\n')

    // 3. Answer with the rotating free-tier client (no long waits for an interactive request)
    const ai = createAIClient({ log: () => {}, maxWaitMs: 0 })
    const messages = [
      { role: 'system', content: SYSTEM(lang) },
      { role: 'user', content: `ARTICLES:\n\n${context}\n\nQUESTION: ${question}` },
    ]
    let { text } = await ai.complete(messages, { json: false })
    // Some models leak Cyrillic/CJK into Hindi (e.g. "ветеран") — retry once with a stricter instruction.
    if (lang === 'hi' && /[Ѐ-ӿ぀-ヿ一-鿿]/.test(text)) {
      messages[0].content += '\nIMPORTANT: use ONLY Devanagari Hindi plus English names. Never use Cyrillic or other scripts.'
      text = (await ai.complete(messages, { json: false })).text
    }

    // Some models (gpt-oss) cite as 【1】 or 【1†source】 — normalise to [1] so the UI can link them.
    const answer = text
      .replace(/【\s*(\d+)[^】]*】/g, '[$1]')
      .replace(/\[(\d+)†[^\]]*\]/g, '[$1]')
      .trim()
    return send(res, 200, {
      answer,
      sources: matches.map((m) => ({
        slug: m.slug,
        title: m.title,
        title_hi: hiById.get(m.id) || null,
        source_name: m.source_name,
      })),
    })
  } catch (e) {
    console.error('[api/ask]', e.message)
    const busy = /All AI providers failed|429/.test(e.message)
    return send(res, busy ? 503 : 500, {
      error: busy ? 'AI is busy right now — please try again in a minute.' : 'Something went wrong.',
    })
  }
}
