import { useParams } from 'react-router-dom'
import ArticleFeed from '../components/ArticleFeed.jsx'
import { CATEGORY_GRADIENTS } from '../components/CategoryBadge.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { CATEGORY_SLUGS, categoryLabel, getCategory } from '../lib/categories.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function CategoryPage() {
  const { slug } = useParams()
  const { t, lang } = useLang()
  const cat = getCategory(slug)
  const label = categoryLabel(slug, lang)
  useSeo({ title: `${label} news`, description: `Latest ${cat.label} news: ${cat.hint}.` })

  if (!CATEGORY_SLUGS.includes(slug)) return <NotFoundPage />

  return (
    <>
      <div
        className={`relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white sm:p-8 ${
          CATEGORY_GRADIENTS[cat.color] ?? CATEGORY_GRADIENTS.slate
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.25),transparent_55%)]" />
        <p className="relative text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">{t('section')}</p>
        <h1 className="font-display relative mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{label}</h1>
        {cat.hint && lang === 'en' && (
          <p className="relative mt-2 max-w-2xl text-sm text-white/85 first-letter:uppercase sm:text-base">{cat.hint}.</p>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ArticleFeed category={slug} columns={2} />
        </div>
        <Sidebar />
      </div>
    </>
  )
}
