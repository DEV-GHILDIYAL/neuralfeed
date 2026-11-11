import { Link } from 'react-router-dom'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { toDayKey } from '../lib/dates.js'
import { useLang } from '../lib/i18n.jsx'

export default function Footer() {
  const { t, lang } = useLang()
  const link = 'hover:text-indigo-600 dark:hover:text-indigo-400'
  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            Neural<span className="text-indigo-600 dark:text-indigo-400">Feed</span>
          </Link>
          <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">{t('footerAbout')}</p>
          <a href="/rss.xml" className={`mt-3 inline-block text-xs font-medium text-orange-600 ${link}`}>
            RSS feed
          </a>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">{t('sections')}</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-500 dark:text-slate-400">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link to={`/category/${c.slug}`} className={link}>
                  {categoryLabel(c.slug, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">{t('browse')}</h3>
          <ul className="space-y-2 text-slate-500 dark:text-slate-400">
            <li><Link to="/" className={link}>{t('topStories')}</Link></li>
            <li><Link to={`/date/${toDayKey()}`} className={link}>{t('today')}</Link></li>
            <li><Link to="/for-you" className={link}>{t('forYou')}</Link></li>
            <li><Link to="/models" className={link}>{t('models')}</Link></li>
            <li><Link to="/ask" className={link}>{t('ask')}</Link></li>
            <li><Link to="/saved" className={link}>{t('saved')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 dark:border-white/[0.07]">
        © {new Date().getFullYear()} NeuralFeed
      </div>
    </footer>
  )
}
