// Per-device preferences kept in localStorage: bookmarks and "For You" topics.
// Every read/write is wrapped — storage can be blocked (private mode etc.) and the
// site must still work without it. Changes are broadcast so all components stay in sync.
import { useCallback, useEffect, useState } from 'react'

const EVENT = 'neuralfeed:local'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — keep in memory only */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value } }))
}

function useLocalState(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback))
  useEffect(() => {
    const onLocal = (e) => e.detail.key === key && setValue(e.detail.value)
    const onStorage = (e) => e.key === key && setValue(read(key, fallback)) // other tabs
    window.addEventListener(EVENT, onLocal)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, onLocal)
      window.removeEventListener('storage', onStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = useCallback((next) => write(key, typeof next === 'function' ? next(read(key, fallback)) : next), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return [value, set]
}

/** Bookmarks: newest first, stored as article ids. */
export function useBookmarks() {
  const [ids, setIds] = useLocalState('bookmarks', [])
  const isSaved = useCallback((id) => ids.includes(id), [ids])
  const toggle = useCallback((id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 300))), [setIds])
  const clear = useCallback(() => setIds([]), [setIds])
  return { ids, isSaved, toggle, clear }
}

/** Topics (category slugs) for the personalised "For You" feed. */
export function useTopics() {
  return useLocalState('topics', [])
}
