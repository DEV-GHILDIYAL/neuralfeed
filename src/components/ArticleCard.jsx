import { useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryBadge, { CATEGORY_GRADIENTS } from './CategoryBadge.jsx'
import BookmarkButton from './BookmarkButton.jsx'
import { categoryLabel, getCategory } from '../lib/categories.js'
import { timeAgo } from '../lib/format.js'
import { useLang } from '../lib/i18n.jsx'

export function ArticleImage({ article, className = '', eager = false }) {
  const [broken, setBroken] = useState(false)
  const { lang } = useLang()
  const cat = getCategory(article.category)

  if (!article.image_url || broken) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${
          CATEGORY_GRADIENTS[cat.color] ?? CATEGORY_GRADIENTS.slate
        } ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:24px_24px]" />
        <span className="font-display relative text-lg font-bold tracking-tight text-white/90">
          {categoryLabel(article.category, lang)}
        </span>
      </div>
    )
  }
  return (
    <img
      src={article.image_url}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setBroken(true)}
      className={`object-cover ${className}`}
    />
  )
}

export function Meta({ article, className = '' }) {
  const { locale } = useLang()
  return (
    <div className={`flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <span className="font-medium text-slate-600 dark:text-slate-300">{article.source_name}</span>
      <span aria-hidden>·</span>
      <time dateTime={article.published_at}>{timeAgo(article.published_at, locale)}</time>
    </div>
  )
}

/** Big lead story with image overlay. */
export function LeadCard({ article }) {
  const { pick, locale } = useLang()
  return (
    <Link
      to={`/article/${article.slug}`}
      className="group relative block h-full min-h-[22rem] overflow-hidden rounded-2xl bg-slate-900 md:min-h-[28rem]"
    >
      <ArticleImage
        article={article}
        eager
        className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <BookmarkButton id={article.id} className="absolute top-4 right-4" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <CategoryBadge slug={article.category} link={false} solid />
        <h2 className="font-display mt-3 text-2xl leading-tight font-bold text-white sm:text-3xl lg:text-[2.1rem]">
          {pick(article, 'title')}
        </h2>
        <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-white/80 sm:text-base">{pick(article, 'summary')}</p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-white/70">
          <span className="font-medium text-white/90">{article.source_name}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.published_at}>{timeAgo(article.published_at, locale)}</time>
        </div>
      </div>
    </Link>
  )
}

/** Horizontal row: small thumbnail + headline. */
export function RowCard({ article, compact = false }) {
  const { pick } = useLang()
  return (
    <Link to={`/article/${article.slug}`} className="group flex gap-4">
      <ArticleImage
        article={article}
        className={`shrink-0 rounded-xl ${compact ? 'h-16 w-20' : 'h-20 w-28 sm:h-24 sm:w-32'}`}
      />
      <div className="min-w-0 flex-1">
        <CategoryBadge slug={article.category} link={false} subtle />
        <h3
          className={`font-display mt-1 leading-snug font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ${
            compact ? 'line-clamp-2 text-sm' : 'line-clamp-3'
          }`}
        >
          {pick(article, 'title')}
        </h3>
        <Meta article={article} className="mt-1" />
      </div>
    </Link>
  )
}

/** Numbered compact item for sidebars. */
export function NumberedItem({ article, n }) {
  const { pick } = useLang()
  return (
    <Link to={`/article/${article.slug}`} className="group flex gap-3">
      <span className="font-display w-6 shrink-0 text-2xl leading-none font-bold text-slate-200 dark:text-slate-700">
        {n}
      </span>
      <div className="min-w-0">
        <h4 className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
          {pick(article, 'title')}
        </h4>
        <Meta article={article} className="mt-1" />
      </div>
    </Link>
  )
}

/** Standard grid card. */
export default function ArticleCard({ article }) {
  const { pick } = useLang()
  return (
    <article className="surface group animate-fade-up relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 dark:hover:border-white/15 dark:hover:shadow-black/40">
      <Link to={`/article/${article.slug}`} tabIndex={-1} className="overflow-hidden">
        <ArticleImage article={article} className="aspect-[16/9] w-full transition duration-500 group-hover:scale-[1.04]" />
      </Link>
      <BookmarkButton
        id={article.id}
        className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-pressed:opacity-100"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <CategoryBadge slug={article.category} />
        </div>
        <Link to={`/article/${article.slug}`}>
          <h3 className="font-display line-clamp-3 text-[1.05rem] leading-snug font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {pick(article, 'title')}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{pick(article, 'summary')}</p>
        <Meta article={article} className="mt-auto pt-2" />
      </div>
    </article>
  )
}

export function CardSkeleton() {
  return (
    <div className="surface animate-pulse overflow-hidden">
      <div className="aspect-[16/9] bg-slate-200 dark:bg-white/5" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-16 rounded bg-slate-200 dark:bg-white/5" />
        <div className="h-4 rounded bg-slate-200 dark:bg-white/5" />
        <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/5" />
      </div>
    </div>
  )
}
