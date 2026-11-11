import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'

export default function NotFoundPage() {
  const { t } = useLang()
  useSeo({ title: t('notFound') })
  return (
    <div className="py-24 text-center">
      <p className="font-display text-6xl font-bold text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{t('notFound')}</h1>
      <Link to="/" className="mt-6 inline-block text-indigo-600 hover:underline dark:text-indigo-400">
        {t('backHome')}
      </Link>
    </div>
  )
}
