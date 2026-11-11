import { useEffect, useState } from 'react'
import ArticleCard, { CardSkeleton, LeadCard } from './ArticleCard.jsx'
import { getArticles } from '../lib/api.js'
import { useLang } from '../lib/i18n.jsx'

/**
 * Reusable paginated grid. Used by category and search pages.
 * `withLead` shows the first article as a large featured card.
 */
export default function ArticleFeed({ category, categories, search, tag, withLead = false, emptyText, columns = 3 }) {
  const { t } = useLang()
  const catKey = categories?.join(',')
  const [articles, setArticles] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPage(0)
    setArticles([])
    getArticles({ category, categories, search, tag, page: 0 })
      .then(({ data, hasMore }) => {
        if (cancelled) return
        setArticles(data)
        setHasMore(hasMore)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, catKey, search, tag])

  const loadMore = async () => {
    const next = page + 1
    setLoading(true)
    try {
      const { data, hasMore } = await getArticles({ category, categories, search, tag, page: next })
      setArticles((prev) => [...prev, ...data])
      setHasMore(hasMore)
      setPage(next)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const grid = columns === 2 ? 'grid gap-5 sm:grid-cols-2' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        {t('couldntLoad')}: {error}
      </div>
    )
  }

  if (loading && articles.length === 0) {
    return (
      <div className={grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return <div className="surface py-16 text-center text-slate-500 dark:text-slate-400">{emptyText ?? t('noArticlesYet')}</div>
  }

  const [lead, ...rest] = withLead ? articles : [null, ...articles]

  return (
    <div className="space-y-6">
      {lead && <LeadCard article={lead} />}
      <div className={grid}>
        {rest.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
