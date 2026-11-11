import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ArticleCard, { CardSkeleton } from '../components/ArticleCard.jsx'
import { CATEGORY_DOT } from '../components/CategoryBadge.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { ChevronLeft, ChevronRight } from '../components/Icons.jsx'
import { getArticlesForDay } from '../lib/api.js'
import { CATEGORIES, categoryLabel, getCategory } from '../lib/categories.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'
import { addDays, formatDayLong, parseDayKey, toDayKey } from '../lib/dates.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function DatePage() {
  const { day } = useParams()
  const date = parseDayKey(day)
  const [articles, setArticles] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const { t, lang, locale } = useLang()
  const dayTitle = date ? formatDayLong(day, locale, t) : ''
  useSeo({ title: dayTitle })

  useEffect(() => {
    if (!date) return
    let cancelled = false
    setArticles(null)
    setError(null)
    setFilter('all')
    getArticlesForDay(day)
      .then((a) => !cancelled && setArticles(a))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  const groups = useMemo(() => {
    if (!articles) return []
    return CATEGORIES.map((cat) => ({ cat, items: articles.filter((a) => a.category === cat.slug) }))
      .concat([{ cat: getCategory('other'), items: articles.filter((a) => !CATEGORIES.some((c) => c.slug === a.category)) }])
      .filter((g) => g.items.length > 0)
  }, [articles])

  if (!date) return <NotFoundPage />

  const today = toDayKey()
  const prevKey = toDayKey(addDays(date, -1))
  const nextKey = toDayKey(addDays(date, 1))
  const hasNext = nextKey <= today
  const visible = filter === 'all' ? groups : groups.filter((g) => g.cat.slug === filter)

  const chip = (active) =>
    `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:ring-white/20'
    }`

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        {/* Day header with prev / next */}
        <div className="surface mb-6 flex items-center gap-3 p-4 sm:p-5">
          <Link
            to={`/date/${prevKey}`}
            aria-label="Previous day"
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-indigo-600 uppercase dark:text-indigo-400">{t('newsArchive')}</p>
            <h1 className="font-display mt-1 text-xl font-bold tracking-tight sm:text-3xl">{dayTitle}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {articles === null ? t('loading') : `${articles.length} ${articles.length === 1 ? t('story') : t('stories')}`}
            </p>
          </div>
          {hasNext ? (
            <Link
              to={`/date/${nextKey}`}
              aria-label="Next day"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 p-2.5 text-slate-300 dark:border-white/10 dark:text-slate-700">
              <ChevronRight className="h-5 w-5" />
            </span>
          )}
        </div>

        {/* Category filter */}
        {groups.length > 1 && (
          <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
            <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>
              {t('all')} <span className="opacity-60">{articles.length}</span>
            </button>
            {groups.map(({ cat, items }) => (
              <button key={cat.slug} className={chip(filter === cat.slug)} onClick={() => setFilter(cat.slug)}>
                {categoryLabel(cat.slug, lang)} <span className="opacity-60">{items.length}</span>
              </button>
            ))}
          </div>
        )}

        {error && <div className="surface p-6 text-red-600">{t('couldntLoad')}: {error}</div>}

        {articles === null && !error && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {articles?.length === 0 && (
          <div className="surface py-16 text-center">
            <p className="font-display text-lg font-semibold">{t('noStoriesDay')}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('pickHighlighted')}
            </p>
          </div>
        )}

        <div className="space-y-12">
          {visible.map(({ cat, items }) => (
            <section key={cat.slug}>
              <h2 className="font-display mb-4 flex items-center gap-2.5 border-b border-slate-200 pb-3 text-xl font-bold tracking-tight dark:border-white/10">
                <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[cat.color] ?? 'bg-slate-500'}`} />
                {categoryLabel(cat.slug, lang)}
                <span className="text-sm font-medium text-slate-400">{items.length}</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Sidebar selectedDay={day} />
    </div>
  )
}
