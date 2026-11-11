import { useState } from 'react'
import ArticleFeed from '../components/ArticleFeed.jsx'
import { CATEGORY_DOT } from '../components/CategoryBadge.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { StarIcon } from '../components/Icons.jsx'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { useLang } from '../lib/i18n.jsx'
import { useTopics } from '../lib/local.js'
import { useSeo } from '../lib/seo.js'

function TopicPicker({ value, onChange }) {
  const { lang } = useLang()
  const toggle = (slug) => onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug])
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const on = value.includes(c.slug)
        return (
          <button
            key={c.slug}
            onClick={() => toggle(c.slug)}
            aria-pressed={on}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              on
                ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:ring-white/30'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[c.color]}`} />
            {categoryLabel(c.slug, lang)}
            {on && <span aria-hidden>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function ForYouPage() {
  const { t } = useLang()
  const [topics, setTopics] = useTopics()
  const [editing, setEditing] = useState(topics.length === 0)
  useSeo({ title: t('forYou') })

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div className="surface mb-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                <StarIcon className="h-6 w-6 text-amber-500" />
                {t('forYouTitle')}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('forYouIntro')}</p>
            </div>
            {topics.length > 0 && (
              <button
                onClick={() => setEditing((e) => !e)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
              >
                {editing ? t('done') : t('editTopics')}
              </button>
            )}
          </div>
          {editing && (
            <div className="mt-5">
              <TopicPicker value={topics} onChange={setTopics} />
            </div>
          )}
        </div>

        {topics.length === 0 ? (
          <div className="surface py-16 text-center text-slate-500 dark:text-slate-400">{t('pickTopicsFirst')}</div>
        ) : (
          <ArticleFeed categories={topics} withLead columns={2} />
        )}
      </div>
      <Sidebar />
    </div>
  )
}
