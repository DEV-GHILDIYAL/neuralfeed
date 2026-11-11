import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ArticleCard, { CardSkeleton, LeadCard, RowCard } from '../components/ArticleCard.jsx'
import { CATEGORY_DOT } from '../components/CategoryBadge.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { ArrowRight } from '../components/Icons.jsx'
import { getArticles } from '../lib/api.js'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { toDayKey } from '../lib/dates.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'

function SectionHeader({ cat, to }) {
  const { t, lang } = useLang()
  return (
    <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-3 dark:border-white/10">
      <h2 className="font-display flex items-center gap-2.5 text-xl font-bold tracking-tight">
        <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[cat.color] ?? 'bg-slate-500'}`} />
        {categoryLabel(cat.slug, lang)}
      </h2>
      <Link
        to={to}
        className="group flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
      >
        {t('seeAll')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}

export default function HomePage() {
  const [top, setTop] = useState(null)
  const [sections, setSections] = useState(null)
  const [error, setError] = useState(null)
  const { t, locale } = useLang()
  useSeo({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: recent } = await getArticles({ pageSize: 12 })
        if (cancelled) return
        // Lead story should have a photo; the 4 headlines beside it are simply the next newest.
        const lead = recent.find((a) => a.image_url) ?? recent[0]
        const latest = lead ? [lead, ...recent.filter((a) => a.id !== lead.id).slice(0, 4)] : []
        setTop(latest)
        const topIds = new Set(latest.map((a) => a.id))
        const perCat = await Promise.all(
          CATEGORIES.map(async (cat) => {
            const { data } = await getArticles({ category: cat.slug, pageSize: 7 })
            return { cat, articles: data.filter((a) => !topIds.has(a.id)).slice(0, 3) }
          }),
        )
        if (!cancelled) setSections(perCat.filter((s) => s.articles.length > 0))
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <div className="surface p-6 text-red-600">{t('couldntLoad')}: {error}</div>
  }

  const [lead, ...side] = top ?? []

  return (
    <div className="space-y-10">
      {/* Briefing header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-indigo-600 uppercase dark:text-indigo-400">
            {t('todaysBriefing')}
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
        </div>
        <Link
          to={`/date/${toDayKey()}`}
          className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
        >
          {t('allTodaysStories')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Lead + top headlines */}
      {top === null ? (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-h-[28rem] animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-white/5" />
            ))}
          </div>
        </div>
      ) : top.length === 0 ? (
        <div className="surface py-20 text-center text-slate-500 dark:text-slate-400">{t('noArticlesYet')}</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <LeadCard article={lead} />
          <div className="surface flex flex-col divide-y divide-slate-200/80 p-5 dark:divide-white/[0.07]">
            <h2 className="font-display pb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t('topHeadlines')}
            </h2>
            {side.map((a) => (
              <div key={a.id} className="py-4 last:pb-0">
                <RowCard article={a} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category sections + sidebar */}
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-12">
          {sections === null
            ? Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }, (_, j) => (
                    <CardSkeleton key={j} />
                  ))}
                </div>
              ))
            : sections.map(({ cat, articles }) => (
                <section key={cat.slug}>
                  <SectionHeader cat={cat} to={`/category/${cat.slug}`} />
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {articles.map((a) => (
                      <ArticleCard key={a.id} article={a} />
                    ))}
                  </div>
                </section>
              ))}
        </div>
        <Sidebar excludeIds={(top ?? []).map((a) => a.id)} />
      </div>
    </div>
  )
}
