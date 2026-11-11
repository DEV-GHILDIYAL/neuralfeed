import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ArticleFeed from '../components/ArticleFeed.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { SearchIcon } from '../components/Icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLang()
  const q = params.get('q')?.trim() || ''
  const tag = params.get('tag')?.trim() || ''
  const [input, setInput] = useState(q)
  useSeo({ title: tag ? `#${tag}` : q ? `Search: ${q}` : 'Search' })

  useEffect(() => setInput(q), [q])

  const submit = (e) => {
    e.preventDefault()
    const v = input.trim()
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  const linkCls = 'text-indigo-600 hover:underline dark:text-indigo-400'

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <form onSubmit={submit} className="relative mb-6">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            autoFocus={!q && !tag}
            className="surface w-full py-3.5 pr-4 pl-12 text-base outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </form>

        {tag ? (
          <>
            <h1 className="font-display mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
              {t('topic')} <span className="text-indigo-600 dark:text-indigo-400">#{tag}</span>
            </h1>
            <ArticleFeed tag={tag} columns={2} emptyText={t('nothingMatched')} />
          </>
        ) : q ? (
          <>
            <h1 className="font-display mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
              {t('resultsFor')} <span className="text-indigo-600 dark:text-indigo-400">“{q}”</span>
            </h1>
            <ArticleFeed search={q} columns={2} emptyText={t('nothingMatched')} />
          </>
        ) : (
          <div className="surface p-8 text-center text-slate-500 dark:text-slate-400">
            <Link className={linkCls} to="/search?q=openai">openai</Link> ·{' '}
            <Link className={linkCls} to="/search?q=gemini">gemini</Link> ·{' '}
            <Link className={linkCls} to="/search?q=nvidia">nvidia</Link> ·{' '}
            <Link className={linkCls} to="/search?q=samsung">samsung</Link>
          </div>
        )}
      </div>
      <Sidebar />
    </div>
  )
}
