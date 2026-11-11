import { useEffect, useState } from 'react'
import ArticleCard, { CardSkeleton } from '../components/ArticleCard.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { BookmarkIcon } from '../components/Icons.jsx'
import { getArticlesByIds } from '../lib/api.js'
import { useLang } from '../lib/i18n.jsx'
import { useBookmarks } from '../lib/local.js'
import { useSeo } from '../lib/seo.js'

export default function SavedPage() {
  const { t } = useLang()
  const { ids, clear } = useBookmarks()
  const [articles, setArticles] = useState(null)
  const [error, setError] = useState(null)
  useSeo({ title: t('savedTitle') })

  const key = ids.join(',')
  useEffect(() => {
    let cancelled = false
    getArticlesByIds(ids)
      .then((a) => !cancelled && setArticles(a))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // keep unsaved cards from lingering after the user un-bookmarks one
  const visible = (articles ?? []).filter((a) => ids.includes(a.id))

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <BookmarkIcon filled className="h-6 w-6 text-indigo-500" />
            {t('savedTitle')}
            {ids.length > 0 && <span className="text-base font-medium text-slate-400">{ids.length}</span>}
          </h1>
          {ids.length > 0 && (
            <button
              onClick={clear}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-red-500 hover:text-red-600 dark:border-white/10 dark:text-slate-300"
            >
              {t('clearAll')}
            </button>
          )}
        </div>

        {error && <div className="surface p-6 text-red-600">{t('couldntLoad')}: {error}</div>}

        {ids.length === 0 ? (
          <div className="surface py-16 text-center text-slate-500 dark:text-slate-400">{t('savedEmpty')}</div>
        ) : articles === null ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: Math.min(ids.length, 4) }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {visible.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
      <Sidebar />
    </div>
  )
}
