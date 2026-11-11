import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CpuIcon, SearchIcon } from '../components/Icons.jsx'
import { getModels } from '../lib/api.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'

const TYPE_STYLE = {
  'open-weights': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  closed: 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300',
  api: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  unknown: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
}

const TYPES = ['all', 'open-weights', 'closed', 'api']

export default function ModelsPage() {
  const { t, locale } = useLang()
  const [models, setModels] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  useSeo({ title: t('modelsTitle'), description: 'Every new AI model launch spotted in the news — LLMs, open-weight models, image, video and code models.' })

  useEffect(() => {
    getModels().then(setModels).catch((e) => setError(e.message))
  }, [])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (models ?? []).filter(
      (m) =>
        (type === 'all' || m.release_type === type) &&
        (!needle || `${m.name} ${m.company}`.toLowerCase().includes(needle)),
    )
  }, [models, q, type])

  const stats = useMemo(() => {
    const list = models ?? []
    return {
      total: list.length,
      open: list.filter((m) => m.release_type === 'open-weights').length,
      companies: new Set(list.map((m) => m.company).filter(Boolean)).size,
    }
  }, [models])

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 p-6 text-white sm:p-8">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display flex items-center gap-2.5 text-3xl font-bold tracking-tight sm:text-4xl">
              <CpuIcon className="h-8 w-8" /> {t('modelsTitle')}
            </h1>
            <p className="mt-2 max-w-xl text-white/85">{t('modelsIntro')}</p>
          </div>
          <dl className="flex gap-6 text-center">
            {[
              [stats.total, t('modelName')],
              [stats.open, 'Open'],
              [stats.companies, t('company')],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="font-display text-3xl font-bold">{models ? n : '–'}</dt>
                <dd className="text-xs tracking-wider text-white/75 uppercase">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('filterModels')}
            className="surface w-full py-2.5 pr-4 pl-10 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-1.5">
          {TYPES.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                type === ty
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10'
              }`}
            >
              {ty === 'all' ? t('all') : ty}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="surface p-6 text-red-600">{t('couldntLoad')}: {error}</div>}

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs tracking-wider text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">{t('modelName')}</th>
              <th className="px-3 py-3 font-semibold">{t('company')}</th>
              <th className="px-3 py-3 font-semibold">{t('type')}</th>
              <th className="px-3 py-3 font-semibold">{t('modality')}</th>
              <th className="px-3 py-3 font-semibold">{t('context')}</th>
              <th className="px-3 py-3 font-semibold">{t('params')}</th>
              <th className="px-5 py-3 font-semibold">{t('announced')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {models === null && !error
              ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-white/5" />
                    </td>
                  </tr>
                ))
              : rows.map((m) => (
                  <tr key={m.id} className="align-top hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-display font-semibold">{m.name}</div>
                      {m.summary && <div className="mt-0.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">{m.summary}</div>}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">{m.company || '—'}</td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TYPE_STYLE[m.release_type] ?? TYPE_STYLE.unknown}`}>
                        {m.release_type}
                      </span>
                    </td>
                    <td className="px-3 py-4 capitalize">{m.modality || '—'}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{m.context_window || '—'}</td>
                    <td className="px-3 py-4 whitespace-nowrap">{m.parameters || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>{new Date(m.announced_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {m.article?.slug && (
                        <Link to={`/article/${m.article.slug}`} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                          {t('source')}: {m.article.source_name} →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
            {models && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('noModels')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
