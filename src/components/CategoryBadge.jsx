import { Link } from 'react-router-dom'
import { categoryLabel, getCategory } from '../lib/categories.js'
import { useLang } from '../lib/i18n.jsx'

// Full class strings so Tailwind can see them at build time.
export const CATEGORY_STYLES = {
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
}

export const CATEGORY_SOLID = {
  violet: 'bg-violet-500 text-white',
  indigo: 'bg-indigo-500 text-white',
  orange: 'bg-orange-500 text-white',
  sky: 'bg-sky-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  teal: 'bg-teal-500 text-white',
  rose: 'bg-rose-500 text-white',
  pink: 'bg-pink-500 text-white',
  slate: 'bg-slate-500 text-white',
}

export const CATEGORY_TEXT = {
  violet: 'text-violet-600 dark:text-violet-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  orange: 'text-orange-600 dark:text-orange-400',
  sky: 'text-sky-600 dark:text-sky-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  teal: 'text-teal-600 dark:text-teal-400',
  rose: 'text-rose-600 dark:text-rose-400',
  pink: 'text-pink-600 dark:text-pink-400',
  slate: 'text-slate-600 dark:text-slate-400',
}

export const CATEGORY_DOT = {
  violet: 'bg-violet-500',
  indigo: 'bg-indigo-500',
  orange: 'bg-orange-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  rose: 'bg-rose-500',
  pink: 'bg-pink-500',
  slate: 'bg-slate-500',
}

export const CATEGORY_GRADIENTS = {
  violet: 'from-violet-500 to-fuchsia-600',
  indigo: 'from-indigo-500 to-blue-600',
  orange: 'from-orange-400 to-amber-600',
  sky: 'from-sky-400 to-cyan-600',
  emerald: 'from-emerald-400 to-green-600',
  teal: 'from-teal-400 to-cyan-600',
  rose: 'from-rose-400 to-red-600',
  pink: 'from-pink-400 to-rose-600',
  slate: 'from-slate-400 to-slate-600',
}

/**
 * Category label.
 *  default: pill · solid: filled pill (for use on images) · subtle: plain colored text
 */
export default function CategoryBadge({ slug, link = true, solid = false, subtle = false }) {
  const { lang } = useLang()
  const cat = getCategory(slug)
  const color = cat.color in CATEGORY_STYLES ? cat.color : 'slate'
  const cls = subtle
    ? `text-[11px] font-semibold tracking-wider uppercase ${CATEGORY_TEXT[color]}`
    : `inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase ${
        solid ? CATEGORY_SOLID[color] : CATEGORY_STYLES[color]
      }`
  const label = categoryLabel(slug, lang)
  return link ? (
    <Link to={`/category/${cat.slug}`} className={`${cls} hover:opacity-80`}>
      {label}
    </Link>
  ) : (
    <span className={cls}>{label}</span>
  )
}
