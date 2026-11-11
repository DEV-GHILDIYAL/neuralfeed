// NeuralFeed daily pipeline
//   npm run news:run      → fetch feeds, write with AI, save to Supabase
//   npm run news:dry      → same, but print results instead of saving (Supabase optional)
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { FEEDS, JUNK_TITLE_PATTERNS } from './feeds.js'
import { fetchFeed, enrichItem } from './rss.js'
import { createAIClient } from './providers/index.js'
import { writeArticle, SkipError } from './writer.js'
import { translateToHindi } from './translate.js'
import { embeddingsEnabled, embedOne, toPgVector } from './embeddings.js'
import { postToTelegram, telegramEnabled } from './telegram.js'
import { saveModelReleases, vectorReady } from './db.js'

const HINDI = process.env.ENABLE_HINDI !== 'false'
const DUP_SIMILARITY = Number(process.env.DUP_SIMILARITY || 0.8) // cosine similarity ≥ this = same story

const DRY_RUN = process.argv.includes('--dry-run')
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES_PER_RUN || 25) // articles to SAVE per run
const MAX_ATTEMPTS = MAX_ARTICLES * 3 // includes items the AI rejects as off-topic/duplicate
const DELAY_MS = Number(process.env.AI_DELAY_MS || 2500) // gap between AI calls (free-tier RPM)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function slugify(title) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/-$/, '')
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

/** Round-robin across categories so one busy feed doesn't take every slot. */
function diversify(items, limit) {
  const buckets = new Map()
  for (const it of items.sort((a, b) => b.publishedAt - a.publishedAt)) {
    if (!buckets.has(it.categoryHint)) buckets.set(it.categoryHint, [])
    buckets.get(it.categoryHint).push(it)
  }
  const out = []
  while (out.length < limit && [...buckets.values()].some((b) => b.length)) {
    for (const b of buckets.values()) {
      if (b.length && out.length < limit) out.push(b.shift())
    }
  }
  return out
}

function dbError(error) {
  const missing = error.code === '42P01' || /does not exist|schema cache/i.test(error.message)
  return new Error(
    `Supabase: ${[error.message, error.code, error.details].filter(Boolean).join(' | ')}` +
      (missing ? '\n   → Table missing: run the SQL files in supabase/migrations/ in the Supabase SQL Editor.' : ''),
  )
}

/** Source URLs already in `table` (queried in small chunks — long URLs get rejected). */
async function existingUrls(supabase, table, links) {
  const found = new Set()
  for (let i = 0; i < links.length; i += 30) {
    const { data, error } = await supabase.from(table).select('source_url').in('source_url', links.slice(i, i + 30))
    if (error) throw dbError(error)
    data.forEach((r) => found.add(r.source_url))
  }
  return found
}

async function main() {
  const startedAt = new Date()
  console.log(`\n🧠 NeuralFeed pipeline ${DRY_RUN ? '(DRY RUN)' : ''} — ${startedAt.toISOString()}`)

  const ai = createAIClient()
  console.log(`AI: ${ai.providers.join(' → ')}`)

  let supabase = null
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    supabase = createClient(url, key, { auth: { persistSession: false } })
  } else if (!DRY_RUN) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or use --dry-run)')
  }

  // 1. Fetch all feeds in parallel
  console.log(`\n📡 Fetching ${FEEDS.length} feeds…`)
  const maxAgeHours = Number(process.env.FEED_MAX_AGE_HOURS || 36) // raise once for a backfill
  const results = await Promise.all(FEEDS.map((f) => fetchFeed(f, { maxAgeHours })))
  let items = [...new Map(results.flat().map((i) => [i.link, i])).values()]
  console.log(`   ${items.length} recent items`)

  // 2. Cheap filters before spending AI quota
  const beforeJunk = items.length
  items = items.filter((i) => !JUNK_TITLE_PATTERNS.some((re) => re.test(i.title)))
  console.log(`   ${beforeJunk - items.length} junk titles dropped (deals, quizzes, podcasts…)`)

  // 3. Drop items already published or previously rejected; load recent headlines for duplicate detection
  let recentTitles = []
  let skippedTableOk = true
  if (supabase && items.length) {
    const links = items.map((i) => i.link)
    const published = await existingUrls(supabase, 'articles', links)
    let rejected = new Set()
    try {
      rejected = await existingUrls(supabase, 'skipped_items', links)
    } catch (e) {
      skippedTableOk = false
      console.log(`   ⚠ skipped_items table not found — run supabase/migrations/0002_skipped_items.sql (saves AI quota)`)
    }
    items = items.filter((i) => !published.has(i.link) && !rejected.has(i.link))
    console.log(`   ${items.length} new (not yet published or rejected)`)

    const since = new Date(Date.now() - 3 * 86400_000).toISOString()
    const { data, error } = await supabase
      .from('articles')
      .select('title')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(80)
    if (error) throw dbError(error)
    recentTitles = data.map((r) => r.title)
  }

  const queue = diversify(items, MAX_ATTEMPTS)
  console.log(`\n✍️  Target: ${MAX_ARTICLES} articles (up to ${queue.length} candidates)…`)

  const useEmbeddings = embeddingsEnabled() && Boolean(supabase) && (await vectorReady(supabase))
  console.log(
    `   features: duplicate-check ${useEmbeddings ? 'ON' : 'OFF'} · hindi ${HINDI ? 'ON' : 'OFF'} · telegram ${
      telegramEnabled() && !DRY_RUN ? 'ON' : 'OFF'
    }`,
  )

  let inserted = 0
  let failed = 0
  let skipped = 0
  let merged = 0
  const saved = []
  for (let [idx, item] of queue.entries()) {
    if (inserted >= MAX_ARTICLES) break
    const label = `[${idx + 1}] ${item.title.slice(0, 75)}`
    try {
      item = await enrichItem(item)

      // (a) Same story already published by another outlet? → attach as extra source, skip AI writing.
      if (useEmbeddings) {
        const probe = await embedOne(`${item.title}\n${item.text.slice(0, 400)}`)
        const { data: hits, error } = await supabase.rpc('match_articles', {
          query_embedding: toPgVector(probe),
          match_count: 1,
          min_similarity: DUP_SIMILARITY,
          since: new Date(Date.now() - 4 * 86400_000).toISOString(),
        })
        if (error) throw dbError(error)
        if (hits?.length) {
          const hit = hits[0]
          if (!DRY_RUN && hit.source_url !== item.link) {
            await supabase.from('article_sources').upsert(
              { article_id: hit.id, source_name: item.sourceName, source_url: item.link, title: item.title, similarity: hit.similarity },
              { onConflict: 'source_url', ignoreDuplicates: true },
            )
          }
          merged++
          console.log(`  ≈ ${label}\n      same story as "${hit.title.slice(0, 60)}" (${hit.similarity.toFixed(2)}) — added as extra source`)
          await sleep(500)
          continue
        }
      }

      // (b) AI writes the article (or rejects it as off-topic / duplicate)
      const { model_releases, ...article } = await writeArticle(ai, item, recentTitles)

      // (c) Hindi translation — optional; the article is saved even if this fails
      let hindi = {}
      if (HINDI) {
        try {
          await sleep(DELAY_MS)
          hindi = await translateToHindi(ai, article)
        } catch (e) {
          console.log(`      ⚠ Hindi translation failed (${e.message.split('\n')[0].slice(0, 80)}) — saving English only`)
        }
      }

      // (d) Embedding of the final article (search, related, future duplicate checks)
      const embedding = useEmbeddings ? await embedOne(`${article.title}\n${article.summary}`) : null

      const row = {
        ...article,
        ...hindi,
        slug: slugify(article.title),
        image_url: item.image,
        source_name: item.sourceName,
        source_url: item.link,
        published_at: item.publishedAt.toISOString(),
        ...(embedding ? { embedding: toPgVector(embedding) } : {}),
      }

      const extras = [hindi.title_hi ? 'hi' : null, model_releases.length ? `${model_releases.length} model(s)` : null]
        .filter(Boolean)
        .join(', ')
      if (DRY_RUN || !supabase) {
        console.log(`  ✔ ${label}\n      → ${row.category} · ${row.ai_provider} · "${row.title}"${extras ? ` [${extras}]` : ''}`)
        if (hindi.title_hi) console.log(`      हिं: ${hindi.title_hi}`)
        for (const m of model_releases) console.log(`      🤖 model: ${m.name} (${m.company}, ${m.release_type})`)
      } else {
        const { data: ins, error } = await supabase.from('articles').insert(row).select('id, slug').single()
        if (error) {
          if (error.code === '23505') throw new SkipError('duplicate: source URL already saved')
          throw dbError(error)
        }
        row.id = ins.id
        await saveModelReleases(supabase, model_releases, row)
        console.log(`  ✔ ${label}\n      → ${row.category} · ${row.ai_provider}${extras ? ` [${extras}]` : ''}`)
      }
      saved.push(row)
      recentTitles.unshift(row.title)
      inserted++
    } catch (err) {
      if (err instanceof SkipError) {
        skipped++
        console.log(`  – ${label}\n      skipped, ${err.message}`)
        if (supabase && !DRY_RUN && skippedTableOk) {
          await supabase
            .from('skipped_items')
            .upsert({ source_url: item.link, title: item.title, reason: err.message.slice(0, 300) }, { onConflict: 'source_url', ignoreDuplicates: true })
        }
      } else {
        failed++
        console.log(`  ✖ ${label}\n      ${err.message.split('\n')[0]}`)
        if (err.message.startsWith('All AI providers failed')) {
          console.log('  Stopping early — every provider is exhausted for now.')
          break
        }
      }
    }
    await sleep(DELAY_MS)
  }

  // (e) Telegram — post everything saved in this run
  if (!DRY_RUN && supabase && telegramEnabled() && saved.length) {
    console.log(`\n📣 Posting ${saved.length} articles to Telegram…`)
    let posted = 0
    for (const row of saved.reverse()) {
      try {
        await postToTelegram(row)
        await supabase.from('articles').update({ telegram_posted_at: new Date().toISOString() }).eq('id', row.id)
        posted++
      } catch (e) {
        if (e.retryAfter) {
          await sleep((e.retryAfter + 1) * 1000)
          continue
        }
        console.log(`  ⚠ ${e.message}`)
        if (/chat not found|bot was kicked|not enough rights|Unauthorized/i.test(e.message)) break
      }
      await sleep(3500) // Telegram allows ~20 posts/min per channel
    }
    console.log(`   ${posted} posted`)
  }

  const stats = ai.stats()
  console.log(
    `\n✅ Done. ${inserted} ${DRY_RUN ? 'written (not saved)' : 'saved'}, ${merged} merged into existing stories, ${skipped} skipped (off-topic/duplicate), ${failed} failed.`,
  )
  console.log('AI usage:', Object.entries(stats).map(([n, s]) => `${n}: ${s.ok} ok / ${s.failed} err`).join(' | '))

  if (supabase && !DRY_RUN) {
    await supabase.from('pipeline_runs').insert({
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      fetched: queue.length,
      inserted,
      failed,
      providers: stats,
    })
  }

  // Fail the GitHub Action only if nothing worked at all
  process.exit(queue.length > 0 && inserted === 0 && skipped === 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('\n💥 Pipeline crashed:', err.message)
  process.exit(1)
})
