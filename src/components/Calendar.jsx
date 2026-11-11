import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDayCounts } from '../lib/api.js'
import { parseDayKey, toDayKey } from '../lib/dates.js'
import { ChevronLeft, ChevronRight } from './Icons.jsx'
import { useLang } from '../lib/i18n.jsx'

// Monday-first short weekday names in the current locale (2024-01-01 was a Monday)
const weekdays = (locale) =>
  Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }))

/**
 * Month calendar. Days that have articles are clickable and show a dot
 * (bigger dot = more articles). Clicking navigates to /date/YYYY-MM-DD.
 */
export default function Calendar({ selected, onPick }) {
  const navigate = useNavigate()
  const { t, locale } = useLang()
  const todayKey = toDayKey()
  const initial = parseDayKey(selected) ?? new Date()
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() })
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  // follow the selected date when it changes from outside (e.g. prev/next day buttons)
  useEffect(() => {
    const d = parseDayKey(selected)
    if (d) setView({ y: d.getFullYear(), m: d.getMonth() })
  }, [selected])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDayCounts(view.y, view.m)
      .then((c) => !cancelled && setCounts(c))
      .catch(() => !cancelled && setCounts({}))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [view.y, view.m])

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1)
    const offset = (first.getDay() + 6) % 7 // Monday-first
    const days = new Date(view.y, view.m + 1, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, i) => toDayKey(new Date(view.y, view.m, i + 1))),
    ]
  }, [view])

  const now = new Date()
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth()
  const monthTotal = Object.values(counts).reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...Object.values(counts))

  const shift = (delta) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const pick = (key) => {
    navigate(`/date/${key}`)
    onPick?.(key)
  }

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="font-display text-sm font-semibold">
            {new Date(view.y, view.m).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {loading ? t('loading') : `${monthTotal} ${monthTotal === 1 ? t('article') : t('articles')}`}
          </div>
        </div>
        <button
          onClick={() => shift(1)}
          disabled={atCurrentMonth}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {weekdays(locale).map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <div key={`e${i}`} />
          const count = counts[key] || 0
          const isSel = key === selected
          const isTodayCell = key === todayKey
          const isFuture = key > todayKey
          const enabled = count > 0
          const dot = count === 0 ? 0 : 4 + Math.round((count / max) * 3)
          return (
            <button
              key={key}
              disabled={!enabled}
              onClick={() => pick(key)}
              title={enabled ? `${count} ${count > 1 ? t('articles') : t('article')}` : ''}
              aria-label={`${parseDayKey(key).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}: ${
                enabled ? `${count} ${count > 1 ? t('articles') : t('article')}` : '0'
              }`}
              aria-current={isSel ? 'date' : undefined}
              className={[
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition',
                isSel
                  ? 'bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-600/30'
                  : enabled
                    ? 'font-medium text-slate-900 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-100 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300'
                    : 'cursor-default text-slate-300 dark:text-slate-600',
                isTodayCell && !isSel ? 'ring-1 ring-indigo-500/60 ring-inset' : '',
              ].join(' ')}
            >
              {Number(key.slice(8))}
              {dot > 0 && (
                <span
                  className={`absolute bottom-1 rounded-full ${isSel ? 'bg-white' : 'bg-indigo-500'}`}
                  style={{ width: dot, height: dot }}
                />
              )}
            </button>
          )
        })}
      </div>

      {!atCurrentMonth && (
        <button
          onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })}
          className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          {t('jumpToMonth')}
        </button>
      )}
    </div>
  )
}
