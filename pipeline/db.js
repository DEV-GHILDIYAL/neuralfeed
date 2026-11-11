// Small Supabase helpers shared by run.js and backfill.js

/** True if migration 0003 (pgvector + match_articles) has been applied. */
export async function vectorReady(supabase) {
  const { error } = await supabase.from('articles').select('embedding').limit(1)
  if (error) {
    console.log('   ⚠ embeddings column missing — run supabase/migrations/0003_features.sql to enable duplicate detection')
    return false
  }
  return true
}

/** Upsert AI model releases found in an article into the model tracker. */
export async function saveModelReleases(supabase, models, article) {
  for (const m of models || []) {
    const name_key = m.name.toLowerCase().replace(/\s+/g, ' ').trim()
    const { error } = await supabase.from('ai_models').upsert(
      {
        ...m,
        name_key,
        announced_at: article.published_at,
        article_id: article.id,
      },
      { onConflict: 'name_key', ignoreDuplicates: true },
    )
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      console.log(`      ⚠ model tracker: ${error.message}`)
    }
  }
}
