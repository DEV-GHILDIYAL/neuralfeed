import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { PauseIcon, PlayIcon, StopIcon } from './Icons.jsx'

// Free text-to-speech using the browser's built-in voices (Web Speech API).
// Text is split into sentence chunks: Chrome silently stops very long utterances.

function chunk(text) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?।]+[.!?।]*/g) || [text]
  const out = []
  let cur = ''
  for (const s of sentences) {
    if ((cur + s).length > 220 && cur) {
      out.push(cur.trim())
      cur = ''
    }
    cur += s
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function pickVoice(langCode) {
  const voices = window.speechSynthesis.getVoices()
  const prefix = langCode.split('-')[0]
  return (
    voices.find((v) => v.lang === langCode) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ||
    null
  )
}

export default function ListenButton({ text }) {
  const { t, lang } = useLang()
  const [state, setState] = useState('idle') // idle | playing | paused
  const [progress, setProgress] = useState(0)
  const cancelled = useRef(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // stop speaking when leaving the page or switching language/article
  useEffect(() => {
    return () => {
      cancelled.current = true
      if (supported) window.speechSynthesis.cancel()
    }
  }, [text, lang, supported])

  if (!supported) return null

  const start = () => {
    const synth = window.speechSynthesis
    synth.cancel()
    cancelled.current = false
    const parts = chunk(text)
    const langCode = lang === 'hi' ? 'hi-IN' : 'en-IN'
    const voice = pickVoice(langCode) || pickVoice(lang === 'hi' ? 'hi' : 'en-US')
    let i = 0
    const speakNext = () => {
      if (cancelled.current) return
      if (i >= parts.length) {
        setState('idle')
        setProgress(0)
        return
      }
      const u = new SpeechSynthesisUtterance(parts[i])
      u.lang = voice?.lang || langCode
      if (voice) u.voice = voice
      u.rate = 1
      u.onend = () => {
        i++
        setProgress(i / parts.length)
        speakNext()
      }
      u.onerror = () => {
        setState('idle')
        setProgress(0)
      }
      synth.speak(u)
    }
    setState('playing')
    setProgress(0)
    speakNext()
  }

  const toggle = () => {
    const synth = window.speechSynthesis
    if (state === 'idle') start()
    else if (state === 'playing') {
      synth.pause()
      setState('paused')
    } else {
      synth.resume()
      setState('playing')
    }
  }

  const stop = () => {
    cancelled.current = true
    window.speechSynthesis.cancel()
    setState('idle')
    setProgress(0)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggle}
        className="relative flex h-9 items-center gap-2 overflow-hidden rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <span
          className="absolute inset-y-0 left-0 bg-indigo-500/40 transition-[width] duration-500"
          style={{ width: `${progress * 100}%` }}
          aria-hidden
        />
        <span className="relative flex items-center gap-2">
          {state === 'playing' ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
          {state === 'idle' ? `🎧 ${t('listen')}` : state === 'playing' ? t('pause') : t('resume')}
        </span>
      </button>
      {state !== 'idle' && (
        <button
          onClick={stop}
          aria-label={t('stop')}
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 hover:text-red-600 dark:border-white/10 dark:text-slate-300"
        >
          <StopIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
