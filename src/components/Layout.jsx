import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import { isSupabaseConfigured } from '../lib/supabase.js'

export default function Layout() {
  const { pathname } = useLocation()
  const fullScreen = pathname === '/shorts' // shorts fill the viewport: no padding, no footer
  // Braces matter: in newer Chrome, scrollTo() returns a Promise, and returning it
  // from useEffect makes React treat it as a cleanup function → "destroy is not a function".
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {!isSupabaseConfigured && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Demo mode — showing sample articles. Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to <code className="font-mono">.env</code> for live news.
        </div>
      )}
      <main className={fullScreen ? 'w-full flex-1' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8'}>
        <Outlet />
      </main>
      {!fullScreen && <Footer />}
    </div>
  )
}
