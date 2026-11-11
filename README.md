# NeuralFeed

Daily **AI & tech news** website where AI writes the briefs — automatically, in **English and Hindi**.

- **Frontend:** React + Vite + Tailwind CSS (deployed on Vercel)
- **Database:** Supabase (Postgres + pgvector)
- **AI:** Groq, Gemini, OpenRouter, Cerebras, Mistral — all free tiers, automatic fallback between models/providers
- **Scheduler:** GitHub Actions (3× a day, free)

## Features

| | |
|---|---|
| 📰 Auto news | Real tech/AI stories from 21 RSS feeds → AI rewrites them as neutral briefs with key points; off-topic stories are rejected |
| 🧬 Story clustering | Embeddings detect when several outlets cover the same story → one article + "Also covered by" list |
| 🇮🇳 Hindi | Every article is translated; one-click EN/हिं switch for the whole UI |
| 🤖 Model Tracker | `/models` — new AI model launches extracted from the news automatically |
| 💬 Ask NeuralFeed | `/ask` — chat that answers from the site's own articles, with citations |
| 🎧 Listen | Text-to-speech on every article (browser voices, free) |
| 🔖 Saved & For You | Bookmarks and a personalised topic feed (stored on the device) |
| 📅 Archive | Calendar to open any day's news |
| 📣 Telegram | New articles auto-posted to your Telegram channel |
| 🔎 SEO | Prerendered HTML per article (meta, Open Graph, JSON-LD), `sitemap.xml`, `rss.xml`, `robots.txt` |

## How it works

```
RSS feeds ─► junk filter ─► full-text + image extraction
   │
   ├─► embedding ─► same story already published? ──yes──► add as extra source (no AI call)
   │
   ▼ no
AI writer (Groq → Gemini → OpenRouter …)  → relevant? category, brief, key points, model launches
   ▼
Hindi translation ─► embedding ─► Supabase ─► Telegram ─► Vercel rebuild (SEO pages)
```

The AI never makes news up — it only rewrites real stories from `pipeline/feeds.js`, and every article links to its source.

## Setup

### 1. Install
```bash
npm install
cp .env.example .env
```

### 2. Supabase
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run each file in `supabase/migrations/` **in order** (`0001`, `0002`, `0003`).
3. **Project Settings → API Keys** → copy into `.env`:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - publishable / `anon` key → `VITE_SUPABASE_ANON_KEY`
   - secret / `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**secret** — never in a `VITE_` variable)

### 3. AI keys (at least one; Gemini strongly recommended — it also powers embeddings)
| Provider | Free key | Env var |
|---|---|---|
| Groq | https://console.groq.com/keys | `GROQ_API_KEY` |
| Google Gemini | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| OpenRouter (`:free` models) | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |
| Cerebras | https://cloud.cerebras.ai | `CEREBRAS_API_KEY` |
| Mistral | https://console.mistral.ai | `MISTRAL_API_KEY` |

Free-tier model names change over time — override with e.g. `GROQ_MODELS=model-a,model-b` if a provider says "model not found".

### 4. Run locally
```bash
npm run dev            # website + /api/ask at http://localhost:5173
npm run news:dry       # test: fetch + write a few articles, print them, don't save
npm run news:run       # fetch + write + save (+ Telegram if configured)
npm run news:backfill  # add embeddings / Hindi / model-tracker data to older articles
```

### 5. Telegram channel (optional)
1. In Telegram, open **@BotFather** → `/newbot` → copy the token → `TELEGRAM_BOT_TOKEN`.
2. Create a public channel, add your bot as **Administrator** (with "Post messages").
3. `TELEGRAM_CHANNEL_ID=@your_channel_username` · `TELEGRAM_LANG=en` or `hi` · `SITE_URL=https://your-site.vercel.app`

### 6. Go live
**Website (Vercel):** import the GitHub repo at [vercel.com/new](https://vercel.com/new) → add Environment Variables:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` (+ any other AI keys — used by `/api/ask`), and `SITE_URL`.
Then **Settings → Git → Deploy Hooks** → create a hook → copy its URL.

**Daily news (GitHub Actions):** repo → **Settings → Secrets and variables → Actions**
- *Secrets:* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, your AI keys, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `VERCEL_DEPLOY_HOOK_URL`
- *Variables:* `SITE_URL` (and optionally `TELEGRAM_LANG`, `MAX_ARTICLES_PER_RUN`)

The workflow runs at 06:00 / 12:00 / 18:00 IST, or manually from the **Actions** tab, and triggers a Vercel rebuild afterwards.

## Project structure
```
api/ask.js           Ask NeuralFeed endpoint (Vercel function; served by Vite plugin in dev)
src/                 React app
  pages/             Home, Category, Article, Date, Search, For You, Saved, Models, Ask
  components/        Header, ArticleCard, Calendar, ListenButton, BookmarkButton, …
  lib/               Supabase API, i18n (EN/HI), categories, dates, SEO, local prefs
pipeline/            news generator (Node)
  feeds.js           RSS sources — add/remove freely
  run.js             main pipeline        backfill.js   fill older articles
  writer.js          AI prompt + validation    translate.js  Hindi
  embeddings.js      Gemini embeddings    telegram.js   channel posting
  providers/         multi-provider AI client with fallback
scripts/prerender.js SEO pages, sitemap, RSS (runs after vite build)
supabase/migrations/ database schema (run in order)
```
