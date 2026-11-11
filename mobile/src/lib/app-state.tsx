// App-wide preferences persisted on the device: language, theme, bookmarks, "For You" topics.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'

import type { Article } from './api'
import { STRINGS, StringKey } from './i18n'
import { Colors, palette } from './theme'

type Lang = 'en' | 'hi'
type ThemePref = 'system' | 'light' | 'dark'

type Persisted = { lang: Lang; theme: ThemePref; bookmarks: string[]; topics: string[] }
const DEFAULTS: Persisted = { lang: 'en', theme: 'system', bookmarks: [], topics: [] }
const KEY = 'neuralfeed:prefs:v1'

type Ctx = Persisted & {
  ready: boolean
  dark: boolean
  colors: Colors
  t: (k: StringKey) => string
  /** Article field in the current language, falling back to English. */
  pick: <K extends 'title' | 'summary' | 'content' | 'key_points'>(a: Article, field: K) => Article[K]
  setLang: (l: Lang) => void
  setTheme: (t: ThemePref) => void
  toggleBookmark: (id: string) => void
  clearBookmarks: () => void
  setTopics: (t: string[]) => void
}

const AppContext = createContext<Ctx | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const system = useColorScheme()

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...DEFAULTS, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const update = useCallback((patch: (s: Persisted) => Partial<Persisted>) => {
    setState((s) => {
      const next = { ...s, ...patch(s) }
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const dark = state.theme === 'system' ? system === 'dark' : state.theme === 'dark'

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      dark,
      colors: dark ? palette.dark : palette.light,
      t: (k) => STRINGS[state.lang][k] ?? STRINGS.en[k],
      pick: (a, field) => {
        if (state.lang === 'hi') {
          const hi = (a as Record<string, unknown>)[`${field}_hi`]
          if (hi && (!Array.isArray(hi) || hi.length)) return hi as never
        }
        return a[field]
      },
      setLang: (lang) => update(() => ({ lang })),
      setTheme: (theme) => update(() => ({ theme })),
      toggleBookmark: (id) =>
        update((s) => ({
          bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((x) => x !== id) : [id, ...s.bookmarks].slice(0, 300),
        })),
      clearBookmarks: () => update(() => ({ bookmarks: [] })),
      setTopics: (topics) => update(() => ({ topics })),
    }),
    [state, ready, dark, update],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>')
  return ctx
}
