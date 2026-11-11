import { useBookmarks } from '../lib/local.js'
import { useLang } from '../lib/i18n.jsx'
import { BookmarkIcon } from './Icons.jsx'

/**
 * variant="icon"  → round icon button (cards, overlays)
 * variant="pill"  → labelled button (article page)
 */
export default function BookmarkButton({ id, variant = 'icon', className = '' }) {
  const { isSaved, toggle } = useBookmarks()
  const { t } = useLang()
  const saved = isSaved(id)
  const onClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(id)
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={onClick}
        aria-pressed={saved}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition ${
          saved
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-300'
            : 'border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300'
        } ${className}`}
      >
        <BookmarkIcon filled={saved} className="h-4 w-4" />
        {saved ? t('savedBtn') : t('save')}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? t('savedBtn') : t('save')}
      title={saved ? t('savedBtn') : t('save')}
      className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${
        saved
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
          : 'bg-black/35 text-white hover:bg-black/55'
      } ${className}`}
    >
      <BookmarkIcon filled={saved} className="h-4 w-4" />
    </button>
  )
}
