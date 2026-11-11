import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArticleImage } from '../components/ArticleCard.jsx'
import BookmarkButton from '../components/BookmarkButton.jsx'
import CategoryBadge, { CATEGORY_DOT } from '../components/CategoryBadge.jsx'
import ListenButton from '../components/ListenButton.jsx'
import { ArrowRight, BoltIcon, ChevronDown, ChevronUp, ShareIcon } from '../components/Icons.jsx'
import { getShorts } from '../lib/api.js'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { timeAgo } from '../lib/format.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'

/** Height of the sticky site header, so the shorts viewport fills exactly the rest of the screen. */
function useHeaderHeight() {
  const [h, setH] = useState(100)
  useLayoutEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const update = () => setH(header.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])
  return h
}

function ShareButton({ article, title }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = `${window.location.origin}/article/${article.slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* user cancelled or clipboard blocked */
    }
  }
  return (
    <button
      onClick={share}
      className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
    >
      <ShareIcon className="h-4 w-4" />
      {copied ? '✓' : t('share')}
    </button>
  )
}

function ShortCard({ article, index, total }) {
  const { t, pick, locale } = useLang()
  const title = pick(article, 'title')
  const summary = pick(article, 'summary')
  const points = (pick(article, 'key_points') || []).slice(0, 3)

  return (
    <article className="flex h-full w-full max-w-[460px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/40">
      <div className="relative h-[36%] min-h-40 shrink-0">
        <ArticleImage article={article} eager={index < 2} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute top-3 left-3">
          <CategoryBadge slug={article.category} link={false} solid />
        </div>
        <span className="absolute top-3 right-14 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          {index + 1}
          {total ? ` / ${total}` : ''}
        </span>
        <BookmarkButton id={article.id} className="absolute top-2.5 right-3" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-5">
        <h2 className="font-display text-xl leading-snug font-bold sm:text-[1.35rem]">{title}</h2>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
          {points.length > 0 && (
            <ul className="mt-4 space-y-2">
              {points.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{article.source_name}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.published_at}>{timeAgo(article.published_at, locale)}</time>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
          <ListenButton text={[title, summary, ...points].join('. ')} />
          <ShareButton article={article} title={title} />
          <Link
            to={`/article/${article.slug}`}
            className="ml-auto flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            {t('readFull')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function ShortsPage() {
  const { t, lang } = useLang()
  const headerH = useHeaderHeight()
  const scroller = useRef(null)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [active, setActive] = useState(0)
  const [category, setCategory] = useState('')
  useSeo({ title: t('shorts'), description: 'AI & tech news in 60 seconds — swipe through today’s stories.' })

  const load = useCallback(
    async (p, cat, replace = false) => {
      setLoading(true)
      setError(null)
      try {
        const { data, hasMore: more } = await getShorts({ page: p, category: cat || undefined })
        setItems((prev) => (replace ? data : [...prev, ...data.filter((d) => !prev.some((x) => x.id === d.id))]))
        setHasMore(more)
        setPage(p)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // (re)load when the category filter changes
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    setActive(0)
    load(0, category, true)
  }, [category, load])

  // track which card is on screen
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.index))
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items])

  // infinite loading
  useEffect(() => {
    if (hasMore && !loading && items.length && active >= items.length - 3) load(page + 1, category)
  }, [active, items.length, hasMore, loading, page, category, load])

  const go = useCallback((dir) => {
    const el = scroller.current
    if (el) el.scrollBy({ top: dir * el.clientHeight, behavior: 'smooth' })
  }, [])

  // keyboard: ↑ ↓ / j k / space
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) return
      if (['ArrowDown', 'j', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        go(1)
      } else if (['ArrowUp', 'k', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const chip = (on) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      on
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10'
    }`

  return (
    <div className="relative" style={{ height: `calc(100dvh - ${headerH}px)` }}>
      {/* category filter */}
      <div className="no-scrollbar absolute inset-x-0 top-0 z-10 mx-auto flex max-w-[460px] gap-1.5 overflow-x-auto px-3 pt-3">
        <button className={chip(!category)} onClick={() => setCategory('')}>
          <BoltIcon className="h-3.5 w-3.5" /> {t('all')}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.slug} className={chip(category === c.slug)} onClick={() => setCategory(c.slug)}>
            <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[c.color]}`} />
            {categoryLabel(c.slug, lang)}
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
        aria-label={t('shorts')}
      >
        {items.map((a, i) => (
          <section key={a.id} data-index={i} className="flex h-full snap-start snap-always justify-center px-3 pt-14 pb-3">
            <ShortCard article={a} index={i} total={hasMore ? null : items.length} />
          </section>
        ))}

        {loading && items.length === 0 && (
          <section className="flex h-full justify-center px-3 pt-14 pb-3">
            <div className="h-full w-full max-w-[460px] animate-pulse rounded-3xl bg-slate-200 dark:bg-white/5" />
          </section>
        )}

        {error && (
          <section className="flex h-full items-center justify-center px-6 text-center text-red-600">
            {t('couldntLoad')}: {error}
          </section>
        )}

        {!hasMore && items.length > 0 && (
          <section className="flex h-full snap-start flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="text-5xl">🎉</div>
            <p className="font-display text-2xl font-bold">{t('allCaughtUp')}</p>
            <p className="text-slate-500 dark:text-slate-400">{t('allCaughtUpSub')}</p>
            <button
              onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              {t('backToTop')}
            </button>
          </section>
        )}

        {!loading && !error && items.length === 0 && (
          <section className="flex h-full items-center justify-center text-slate-500">{t('noArticlesYet')}</section>
        )}
      </div>

      {/* desktop navigation controls */}
      <div className="pointer-events-none absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
        <button
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label="Previous"
          className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white shadow-lg transition hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-30 dark:border-white/10 dark:bg-slate-900"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Next"
          className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white shadow-lg transition hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-900"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        <p className="mt-2 w-24 text-center text-xs text-slate-400">{t('shortsHint')}</p>
      </div>
    </div>
  )
}
