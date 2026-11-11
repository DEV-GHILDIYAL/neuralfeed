// Text embeddings via Gemini (free tier). Used for:
//  - duplicate-story detection in the pipeline
//  - related articles + "Ask NeuralFeed" semantic search
// Returns null when GEMINI_API_KEY is missing so callers can degrade gracefully.

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001'
export const EMBEDDING_DIMS = 768 // must match vector(768) in supabase/migrations/0003_features.sql

export function embeddingsEnabled() {
  return Boolean(process.env.GEMINI_API_KEY)
}

/** Embed one or more texts → array of number[] (or null if disabled). */
export async function embed(texts) {
  if (!embeddingsEnabled()) return null
  const input = (Array.isArray(texts) ? texts : [texts]).map((t) => String(t).slice(0, 6000))

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GEMINI_API_KEY}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMS }),
      signal: AbortSignal.timeout(30_000),
    })
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 15_000 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw new Error(`Embedding HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    return data.data.map((d) => d.embedding)
  }
}

export async function embedOne(text) {
  const out = await embed([text])
  return out ? out[0] : null
}

/** pgvector accepts the JSON-array text form. */
export const toPgVector = (v) => (v ? JSON.stringify(v) : null)
