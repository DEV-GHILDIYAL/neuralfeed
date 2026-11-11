import { CATEGORIES, CATEGORY_SLUGS } from '../src/lib/categories.js'

const SYSTEM_PROMPT = `You are the editor of "NeuralFeed", a TECHNOLOGY and AI news site.
You receive ONE news item (headline + text from a real publisher) plus a list of headlines already published.

Step 1 — Decide if it belongs on NeuralFeed. It must be primarily about technology:
AI, AI models, software, hardware/gadgets, chips, tech companies & their markets, startups, developers, cybersecurity, internet platforms.
Reject (relevant=false) general news where tech is only incidental: crime, politics, celebrity gossip,
personal scandals, sports, lifestyle, shopping deals/discount roundups, quizzes, opinion columns with no news.
Example: a tech CEO's personal scandal → reject unless the story is mainly about company/market impact.

Step 2 — Is it the SAME news event as one of the already-published headlines (even if worded differently or from another outlet)?
If yes, duplicate=true.

Step 3 — If relevant and not duplicate, write a short, neutral, original news brief based ONLY on the facts provided.
- Never invent facts, numbers, quotes, names, model specs, prices or dates not in the input.
- If the input is thin, write a shorter article — do not pad with speculation.
- Rephrase in your own words; do not copy sentences.
- Neutral tone, no hype, no clickbait. English only.

Categories:
${CATEGORIES.map((c) => `- ${c.slug}: ${c.hint}`).join('\n')}

Respond with a single JSON object, no markdown fences:
{
  "relevant": true or false,
  "duplicate": true or false,
  "reason": "one short sentence explaining the relevant/duplicate decision",
  "title": "clear headline, max 110 chars",
  "summary": "1-2 sentence summary, max 240 chars",
  "content": "article body, 2-4 short paragraphs separated by \\n\\n, 120-300 words",
  "key_points": ["3 to 4 short bullet points"],
  "category": "one of: ${CATEGORY_SLUGS.join(', ')}",
  "tags": ["3 to 5 lowercase topical tags, e.g. company or model names"],
  "model_releases": []
}
"model_releases": ONLY if this story announces the launch/release of a NEW AI model or a new model version
(LLM, image/video/audio/code model), list each one as
{ "name": "exact model name e.g. Gemini 3.5 Flash", "company": "...", "release_type": "open-weights|closed|api|unknown",
  "modality": "text|multimodal|image|video|audio|code|other", "context_window": "e.g. 1M tokens or empty",
  "parameters": "e.g. 70B or empty", "summary": "one line: what is new" }.
Use only facts from the input; leave unknown fields as "". Products/apps/features that are not models → do not list.
Otherwise use an empty array.
If relevant=false or duplicate=true you may leave the other fields empty.`

function extractJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object in AI response')
    return JSON.parse(match[0])
  }
}

export class SkipError extends Error {}

function validate(obj, item) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const arr = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])
  const bool = (v) => v === true || v === 'true'

  if (!bool(obj.relevant)) throw new SkipError(`not tech: ${str(obj.reason) || 'off-topic'}`)
  if (bool(obj.duplicate)) throw new SkipError(`duplicate: ${str(obj.reason) || 'same story already published'}`)

  const category = str(obj.category).toLowerCase()
  const out = {
    title: str(obj.title) || item.title,
    summary: str(obj.summary),
    content: str(obj.content),
    key_points: arr(obj.key_points).slice(0, 5),
    category: CATEGORY_SLUGS.includes(category) ? category : item.categoryHint,
    tags: arr(obj.tags)
      .map((t) => t.toLowerCase().replace(/^#/, ''))
      .slice(0, 6),
  }
  if (out.summary.length < 20 || out.content.length < 80) {
    throw new Error('AI response too short / missing fields')
  }

  const RELEASE_TYPES = ['open-weights', 'closed', 'api', 'unknown']
  out.model_releases = (Array.isArray(obj.model_releases) ? obj.model_releases : [])
    .filter((m) => m && str(m.name).length >= 2)
    .slice(0, 5)
    .map((m) => ({
      name: str(m.name).slice(0, 120),
      company: str(m.company).slice(0, 80),
      release_type: RELEASE_TYPES.includes(str(m.release_type)) ? str(m.release_type) : 'unknown',
      modality: str(m.modality).slice(0, 30) || 'other',
      context_window: str(m.context_window).slice(0, 40),
      parameters: str(m.parameters).slice(0, 40),
      summary: str(m.summary).slice(0, 300),
    }))
  return out
}

/**
 * Turn a raw RSS item into a finished article using the AI client.
 * Throws SkipError if the AI decides the item is off-topic or a duplicate.
 * @param {string[]} recentTitles headlines already published (for duplicate detection)
 */
export async function writeArticle(ai, item, recentTitles = []) {
  const userPrompt = [
    'ALREADY PUBLISHED HEADLINES:',
    recentTitles.length ? recentTitles.slice(0, 80).map((t) => `- ${t}`).join('\n') : '(none)',
    '',
    'NEW ITEM:',
    `Source: ${item.sourceName}`,
    `Category hint: ${item.categoryHint}`,
    `Published: ${item.publishedAt.toISOString()}`,
    `Headline: ${item.title}`,
    `Text: ${item.text || '(no text — rely on the headline only, keep it brief)'}`,
  ].join('\n')

  const { text, provider, model } = await ai.complete([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ])

  const article = validate(extractJson(text), item)
  return { ...article, ai_provider: provider, ai_model: model }
}
