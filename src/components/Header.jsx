import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { parseDayKey, toDayKey } from '../lib/dates.js'
import { useLang } from '../lib/i18n.jsx'
import { useBookmarks } from '../lib/local.js'
import Calendar from './Calendar.jsx'
import { BoltIcon, BookmarkIcon, CalendarIcon, ChatIcon, CpuIcon, MoonIcon, SearchIcon, StarIcon, SunIcon } from './Icons.jsx'

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* storage unavailable */
    }
  }, [dark])
  return [dark, setDark]
}

const iconBtn =
  'relative grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'

function CalendarPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { pathname } = useLocation()
  const { t, locale } = useLang()
  const selected = pathname.startsWith('/date/') ? pathname.slice(6) : null

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('browseByDate')}
        className={`flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition ${
          open || selected
            ? 'border-indigo-500/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'
        }`}
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="hidden md:inline">
          {selected && parseDayKey(selected)
            ? parseDayKey(selected).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
            : t('archive')}
        </span>
      </button>
      {open && (
        <div className="animate-fade-up absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <Calendar selected={selected ?? toDayKey()} onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const [dark, setDark] = useTheme()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { t, lang, setLang } = useLang()
  const { ids } = useBookmarks()

  const onSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const navClass = ({ isActive }) =>
    `relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium transition ${
      isActive
        ? 'text-slate-900 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-indigo-600 dark:text-white dark:after:bg-indigo-400'
        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0a0d14]/80">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 pt-3 sm:gap-3 sm:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Neural<span className="text-indigo-600 dark:text-indigo-400">Feed</span>
          </span>
        </Link>

        <form onSubmit={onSearch} className="relative ml-auto hidden w-full max-w-xs lg:block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-full border border-slate-200 bg-slate-100/70 py-2 pr-4 pl-10 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 lg:ml-0">
          <button onClick={() => navigate('/search')} aria-label="Search" className={`${iconBtn} lg:hidden`}>
            <SearchIcon className="h-5 w-5" />
          </button>
          <CalendarPopover />
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="h-9 rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
            aria-label={lang === 'en' ? 'हिंदी में पढ़ें' : 'Read in English'}
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <Link to="/saved" aria-label={t('saved')} title={t('saved')} className={iconBtn}>
            <BookmarkIcon className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {ids.length > 99 ? '99+' : ids.length}
              </span>
            )}
          </Link>
          <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode" className={`${iconBtn} hidden sm:grid`}>
            {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="no-scrollbar mx-auto flex max-w-7xl overflow-x-auto px-2 sm:px-3">
        <NavLink to="/" end className={navClass}>
          {t('topStories')}
        </NavLink>
        <NavLink to="/shorts" className={navClass}>
          <BoltIcon className="h-3.5 w-3.5 text-amber-500" />
          {t('shorts')}
        </NavLink>
        <NavLink to="/for-you" className={navClass}>
          <StarIcon className="h-3.5 w-3.5" />
          {t('forYou')}
        </NavLink>
        <NavLink to={`/date/${toDayKey()}`} className={navClass}>
          {t('today')}
        </NavLink>
        <NavLink to="/ask" className={navClass}>
          <ChatIcon className="h-3.5 w-3.5 text-indigo-500" />
          {t('ask')}
        </NavLink>
        <NavLink to="/models" className={navClass}>
          <CpuIcon className="h-3.5 w-3.5 text-violet-500" />
          {t('models')}
        </NavLink>
        <span className="mx-1 my-3 w-px shrink-0 bg-slate-200 dark:bg-white/10" aria-hidden />
        {CATEGORIES.map((c) => (
          <NavLink key={c.slug} to={`/category/${c.slug}`} className={navClass}>
            {categoryLabel(c.slug, lang)}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
