// Fills in data for articles saved before a feature existed:
//   embeddings (duplicate check / related / Ask), Hindi translation, AI model tracker.
//   npm run news:backfill              → all three
//   npm run news:backfill -- --only=embeddings|hindi|models
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { createAIClient } from './providers/index.js'
import { translateToHindi } from './translate.js'
import { embed, embeddingsEnabled, toPgVector } from './embeddings.js'
import { saveModelReleases } from './db.js'

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const want = (k) => !only || only === k
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DELAY_MS = Number(process.env.AI_DELAY_MS || 2500)

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const MODEL_PROMPT = `Does this tech news brief announce the launch/release of a NEW AI model or model version?
Return JSON only: {"model_releases": [ { "name": "", "company": "", "release_type": "open-weights|closed|api|unknown",
"modality": "text|multimodal|image|video|audio|code|other", "context_window": "", "parameters": "", "summary": "one line" } ]}
Only facts from the text; unknown → "". Apps/features/products that are not models → empty array.`

async function backfillEmbeddings() {
  if (!embeddingsEnabled()) return console.log('skip embeddings: GEMINI_API_KEY not set')
  const { data, error } = await supabase.from('articles').select('id, title, summary').is('embedding', null).limit(1000)
  if (error) throw new Error(error.message)
  console.log(`\n🧬 Embeddings: ${data.length} articles`)
  for (let i = 0; i < data.length; i += 20) {
    const batch = data.slice(i, i + 20)
    const vectors = await embed(batch.map((a) => `${a.title}\n${a.summary}`))
    for (const [j, a] of batch.entries()) {
      const { error: e } = await supabase.from('articles').update({ embedding: toPgVector(vectors[j]) }).eq('id', a.id)
      if (e) console.log(`  ✖ ${a.title.slice(0, 60)}: ${e.message}`)
    }
    console.log(`  ✔ ${Math.min(i + 20, data.length)}/${data.length}`)
  }
}

async function backfillHindi(ai) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, summary, content, key_points')
    .is('title_hi', null)
    .order('published_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  console.log(`\n🇮🇳 Hindi: ${data.length} articles`)
  for (const a of data) {
    try {
      const hi = await translateToHindi(ai, a)
      await supabase.from('articles').update(hi).eq('id', a.id)
      console.log(`  ✔ ${hi.title_hi.slice(0, 70)}`)
    } catch (e) {
      console.log(`  ✖ ${a.title.slice(0, 60)}: ${e.message.split('\n')[0].slice(0, 100)}`)
      if (e.message.startsWith('All AI providers failed')) break
    }
    await sleep(DELAY_MS)
  }
}

async function backfillModels(ai) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, summary, content, published_at')
    .in('category', ['models', 'ai', 'tools'])
    .order('published_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  console.log(`\n🤖 Model tracker: scanning ${data.length} AI articles`)
  for (const a of data) {
    try {
      const { text } = await ai.complete([
        { role: 'system', content: MODEL_PROMPT },
        { role: 'user', content: `${a.title}\n\n${a.summary}\n\n${a.content}` },
      ])
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
      const models = (parsed.model_releases || []).filter((m) => m?.name?.trim().length >= 2)
      if (models.length) {
        await saveModelReleases(
          supabase,
          models.map((m) => ({
            name: m.name.trim(),
            company: (m.company || '').trim(),
            release_type: ['open-weights', 'closed', 'api'].includes(m.release_type) ? m.release_type : 'unknown',
            modality: (m.modality || 'other').trim(),
            context_window: (m.context_window || '').trim(),
            parameters: (m.parameters || '').trim(),
            summary: (m.summary || '').trim(),
          })),
          a,
        )
        console.log(`  🤖 ${models.map((m) => m.name).join(', ')}  ← ${a.title.slice(0, 50)}`)
      }
    } catch (e) {
      console.log(`  ✖ ${a.title.slice(0, 60)}: ${e.message.split('\n')[0].slice(0, 100)}`)
      if (e.message.startsWith('All AI providers failed')) break
    }
    await sleep(DELAY_MS)
  }
}

try {
  const ai = createAIClient()
  if (want('embeddings')) await backfillEmbeddings()
  if (want('hindi')) await backfillHindi(ai)
  if (want('models')) await backfillModels(ai)
  console.log('\n✅ Backfill done')
  process.exit(0)
} catch (e) {
  console.error('💥', e.message)
  process.exit(1)
}
