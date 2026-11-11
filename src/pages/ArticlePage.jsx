import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CategoryBadge from '../components/CategoryBadge.jsx'
import { ArticleImage, RowCard } from '../components/ArticleCard.jsx'
import BookmarkButton from '../components/BookmarkButton.jsx'
import ListenButton from '../components/ListenButton.jsx'
import { AskPromo, SideCard, TrendingTags } from '../components/Sidebar.jsx'
import { CalendarIcon, ClockIcon, ExternalIcon, LinkIcon, SparkIcon } from '../components/Icons.jsx'
import { getArticleBySlug, getRelated, getStorySources } from '../lib/api.js'
import { formatDate, readingTime } from '../lib/format.js'
import { formatDayLong, toDayKey } from '../lib/dates.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'
import NotFoundPage from './NotFoundPage.jsx'

function ReadingProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setP(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5">
      <div className="h-full bg-indigo-500 transition-[width] duration-150" style={{ width: `${p}%` }} />
    </div>
  )
}

function ShareBar({ title }) {
  const [copied, setCopied] = useState(false)
  const { t } = useLang()
  const url = window.location.href
  const text = encodeURIComponent(title)
  const u = encodeURIComponent(url)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }
  const btn =
    'flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300'
  return (
    <>
      <button onClick={copy} className={btn}>
        <LinkIcon className="h-4 w-4" />
        {copied ? t('copied') : t('copyLink')}
      </button>
      <a className={btn} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${text}%20${u}`}>
        WhatsApp
      </a>
      <a className={btn} target="_blank" rel="noopener noreferrer" href={`https://x.com/intent/post?text=${text}&url=${u}`}>
        X
      </a>
      <a className={btn} target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`}>
        LinkedIn
      </a>
    </>
  )
}

export default function ArticlePage() {
  const { slug } = useParams()
  const { t, pick, locale, lang } = useLang()
  const [article, setArticle] = useState(undefined) // undefined = loading, null = not found
  const [related, setRelated] = useState([])
  const [sources, setSources] = useState([])
  const [error, setError] = useState(null)

  useSeo(
    article
      ? { title: pick(article, 'title'), description: pick(article, 'summary'), image: article.image_url, type: 'article' }
      : {},
  )

  useEffect(() => {
    let cancelled = false
    setArticle(undefined)
    setRelated([])
    setSources([])
    getArticleBySlug(slug)
      .then((a) => {
        if (cancelled) return
        setArticle(a)
        if (a) {
          getRelated(a, 5).then((r) => !cancelled && setRelated(r)).catch(() => {})
          getStorySources(a.id).then((s) => !cancelled && setSources(s)).catch(() => {})
        }
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [slug])

  if (error) return <div className="surface p-6 text-red-600">{t('couldntLoad')}: {error}</div>
  if (article === null) return <NotFoundPage />
  if (article === undefined) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        <div className="h-5 w-24 rounded bg-slate-200 dark:bg-white/5" />
        <div className="h-12 rounded bg-slate-200 dark:bg-white/5" />
        <div className="h-6 w-2/3 rounded bg-slate-200 dark:bg-white/5" />
        <div className="aspect-video rounded-2xl bg-slate-200 dark:bg-white/5" />
      </div>
    )
  }

  const title = pick(article, 'title')
  const summary = pick(article, 'summary')
  const content = pick(article, 'content')
  const keyPoints = pick(article, 'key_points') || []
  const paragraphs = content.split(/\n{2,}/).filter(Boolean)
  const dayKey = toDayKey(article.published_at)
  const listenText = [title, summary, ...paragraphs].join('. ')
  const showingHindi = lang === 'hi' && article.title_hi

  return (
    <>
      <ReadingProgress />
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <article className="min-w-0" lang={showingHindi ? 'hi' : 'en'}>
          <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">NeuralFeed</Link>
            <span>/</span>
            <CategoryBadge slug={article.category} subtle />
          </nav>

          <h1 className="font-display text-3xl leading-[1.2] font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">{summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{article.source_name}</span>
            <Link to={`/date/${dayKey}`} className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400">
              <CalendarIcon className="h-4 w-4" />
              {formatDate(article.published_at, locale)}
            </Link>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              {readingTime(article.content)} {t('minRead')}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 dark:border-white/10">
            <ListenButton text={listenText} />
            <BookmarkButton id={article.id} variant="pill" />
            <ShareBar title={title} />
          </div>

          <ArticleImage article={article} eager className="mt-6 aspect-[16/9] w-full rounded-2xl" />

          {keyPoints.length > 0 && (
            <aside className="mt-8 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-violet-500/5">
              <h2 className="font-display mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-indigo-700 uppercase dark:text-indigo-300">
                <SparkIcon className="h-4 w-4" /> {t('keyPoints')}
              </h2>
              <ul className="space-y-2.5">
                {keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-3 leading-relaxed">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <div
            className={`mt-8 max-w-[68ch] space-y-6 text-[1.15rem] leading-[1.85] text-slate-800 dark:text-slate-200 ${
              showingHindi ? 'font-sans' : 'font-serif'
            }`}
          >
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {article.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/search?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="surface mt-8 p-5">
              <h2 className="font-display mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {t('alsoCoveredBy')}
              </h2>
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li key={s.source_url}>
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 text-sm hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <ExternalIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        <span className="font-semibold">{s.source_name}</span>
                        {s.title && <span className="text-slate-500 dark:text-slate-400"> — {s.title}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="surface mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">🤖 {t('writtenByAi')}</p>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {t('readOn')} {article.source_name} <ExternalIcon className="h-4 w-4" />
            </a>
          </div>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          {related.length > 0 && (
            <SideCard title={t('moreInSection')}>
              <div className="space-y-5">
                {related.map((a) => (
                  <RowCard key={a.id} article={a} compact />
                ))}
              </div>
            </SideCard>
          )}
          <Link
            to={`/date/${dayKey}`}
            className="surface group flex items-center gap-3 p-5 transition hover:border-indigo-500 dark:hover:border-indigo-400"
          >
            <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t('allNewsFrom')}</span>
              <span className="font-display font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {formatDayLong(dayKey, locale)}
              </span>
            </span>
          </Link>
          <AskPromo />
          <TrendingTags />
        </aside>
      </div>
    </>
  )
}
