import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Calendar from './Calendar.jsx'
import { NumberedItem } from './ArticleCard.jsx'
import { getArticles, getTrendingTags } from '../lib/api.js'
import { toDayKey } from '../lib/dates.js'
import { useLang } from '../lib/i18n.jsx'
import { CalendarIcon, ChatIcon, ClockIcon, TrendIcon } from './Icons.jsx'

export function SideCard({ title, icon: Icon, children }) {
  return (
    <section className="surface p-5">
      {title && (
        <h2 className="font-display mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

export function TrendingTags() {
  const [tags, setTags] = useState(null)
  const { t } = useLang()
  useEffect(() => {
    getTrendingTags().then(setTags).catch(() => setTags([]))
  }, [])
  if (tags && tags.length === 0) return null
  return (
    <SideCard title={t('trendingTopics')} icon={TrendIcon}>
      <div className="flex flex-wrap gap-2">
        {(tags ?? Array.from({ length: 8 }, (_, i) => ({ tag: i }))).map(({ tag, count }) =>
          tags ? (
            <Link
              key={tag}
              to={`/search?tag=${encodeURIComponent(tag)}`}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
            >
              #{tag}
              {count > 1 && <span className="ml-1 text-xs text-slate-400">{count}</span>}
            </Link>
          ) : (
            <span key={tag} className="h-7 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
          ),
        )}
      </div>
    </SideCard>
  )
}

export function LatestList({ excludeIds = [], limit = 6 }) {
  const [items, setItems] = useState([])
  const { t } = useLang()
  const exclude = excludeIds.join(',')
  useEffect(() => {
    getArticles({ pageSize: limit + 8 })
      .then(({ data }) => setItems(data.filter((a) => !exclude.split(',').includes(a.id)).slice(0, limit)))
      .catch(() => setItems([]))
  }, [exclude, limit])
  if (items.length === 0) return null
  return (
    <SideCard title={t('latest')} icon={ClockIcon}>
      <div className="space-y-4">
        {items.map((a, i) => (
          <NumberedItem key={a.id} article={a} n={i + 1} />
        ))}
      </div>
    </SideCard>
  )
}

export function AskPromo() {
  const { t } = useLang()
  return (
    <Link
      to="/ask"
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.3),transparent_55%)]" />
      <ChatIcon className="relative h-6 w-6" />
      <p className="font-display relative mt-3 text-lg font-bold">{t('askTitle')}</p>
      <p className="relative mt-1 text-sm text-white/80">{t('askPlaceholder')}</p>
    </Link>
  )
}

export default function Sidebar({ selectedDay, showLatest = true, excludeIds }) {
  const { t } = useLang()
  return (
    <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
      <SideCard title={t('browseByDate')} icon={CalendarIcon}>
        <Calendar selected={selectedDay ?? toDayKey()} />
      </SideCard>
      <AskPromo />
      <TrendingTags />
      {showLatest && <LatestList excludeIds={excludeIds} />}
    </aside>
  )
}
