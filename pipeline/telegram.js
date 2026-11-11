// Auto-post new articles to a Telegram channel.
// Setup: create a bot with @BotFather → TELEGRAM_BOT_TOKEN.
//        Add the bot as an ADMIN of your channel → TELEGRAM_CHANNEL_ID (e.g. @neuralfeed_news or -100123…).
// SITE_URL (e.g. https://neuralfeed.vercel.app) makes the post link to your site instead of the source.

import { getCategory } from '../src/lib/categories.js'

export function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID)
}

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function buildCaption(a) {
  const site = process.env.SITE_URL?.replace(/\/$/, '')
  const link = site ? `${site}/article/${a.slug}` : a.source_url
  const cat = getCategory(a.category).label
  const tags = (a.tags || []).slice(0, 4).map((t) => '#' + t.replace(/[^\p{L}\p{N}_]/gu, '')).filter((t) => t.length > 1)
  const lang = (process.env.TELEGRAM_LANG || 'en').toLowerCase()
  const title = lang === 'hi' && a.title_hi ? a.title_hi : a.title
  const summary = lang === 'hi' && a.summary_hi ? a.summary_hi : a.summary
  return [
    `<b>${esc(title)}</b>`,
    '',
    esc(summary),
    '',
    `🏷 ${esc(cat)} · 📰 ${esc(a.source_name)}`,
    `<a href="${esc(link)}">${lang === 'hi' ? 'पूरी खबर पढ़ें →' : 'Read more →'}</a>`,
    tags.length ? '\n' + tags.join(' ') : '',
  ]
    .join('\n')
    .trim()
}

async function call(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) {
    const err = new Error(`Telegram ${method}: ${data.description || res.status}`)
    err.retryAfter = data.parameters?.retry_after
    throw err
  }
  return data.result
}

/** Posts one article. Photo post when an image exists (caption ≤ 1024 chars), else a text message. */
export async function postToTelegram(article) {
  const chat_id = process.env.TELEGRAM_CHANNEL_ID
  const caption = buildCaption(article)
  if (article.image_url && caption.length <= 1024) {
    try {
      return await call('sendPhoto', { chat_id, photo: article.image_url, caption, parse_mode: 'HTML' })
    } catch (e) {
      if (e.retryAfter) throw e // rate limit — let caller wait
      // image URL rejected by Telegram → fall back to text
    }
  }
  return call('sendMessage', { chat_id, text: caption, parse_mode: 'HTML', link_preview_options: { is_disabled: false } })
}
