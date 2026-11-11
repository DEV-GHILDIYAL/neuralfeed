// English → Hindi translation of a finished article, using the same AI rotation.

const SYSTEM_PROMPT = `You translate English tech news into natural, simple Hindi (Devanagari) for Indian readers.
Rules:
- Keep names of companies, products, AI models, people and technical terms in their original English/Latin form
  (e.g. "OpenAI", "GPT-5", "Nvidia", "API", "chip") — do not transliterate them.
- Use everyday Hindi that a general reader understands; avoid heavy Sanskritised words.
- Keep every fact, number and date exactly as in the source. Do not add anything.
- Keep the same paragraph breaks (\\n\\n) in content.

Respond with a single JSON object, no markdown fences:
{ "title_hi": "...", "summary_hi": "...", "content_hi": "...", "key_points_hi": ["..."] }`

function extractJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in translation response')
    return JSON.parse(match[0])
  }
}

const hasDevanagari = (s) => /[ऀ-ॿ]/.test(s || '')

/** Translate with one retry — the second attempt usually fixes a stray-script glitch. */
export async function translateToHindi(ai, article) {
  try {
    return await translateOnce(ai, article)
  } catch (e) {
    if (e.message.startsWith('All AI providers failed')) throw e
    return translateOnce(ai, article, 'Previous attempt was invalid. Output ONLY Hindi (Devanagari) plus English names — no other scripts.')
  }
}

async function translateOnce(ai, article, extra = '') {
  const { text } = await ai.complete([
    { role: 'system', content: extra ? `${SYSTEM_PROMPT}\n\n${extra}` : SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({
        title: article.title,
        summary: article.summary,
        content: article.content,
        key_points: article.key_points,
      }),
    },
  ])
  const o = extractJson(text)
  const out = {
    title_hi: String(o.title_hi || '').trim(),
    summary_hi: String(o.summary_hi || '').trim(),
    content_hi: String(o.content_hi || '').trim(),
    key_points_hi: Array.isArray(o.key_points_hi) ? o.key_points_hi.map((s) => String(s).trim()).filter(Boolean) : [],
  }
  if (!hasDevanagari(out.title_hi) || !hasDevanagari(out.content_hi)) {
    throw new Error('Translation did not return Hindi text')
  }
  // Models occasionally leak other scripts (Cyrillic, CJK, Arabic…) into Hindi output — reject those.
  const all = [out.title_hi, out.summary_hi, out.content_hi, ...out.key_points_hi].join(' ')
  if (/[Ѐ-ӿ؀-ۿ぀-ヿ一-鿿가-힯]/.test(all)) {
    throw new Error('Translation contains characters from another script')
  }
  return out
}
