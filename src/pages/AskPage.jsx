import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatIcon, SendIcon } from '../components/Icons.jsx'
import { askQuestion } from '../lib/api.js'
import { useLang } from '../lib/i18n.jsx'
import { useSeo } from '../lib/seo.js'

const SUGGESTIONS = {
  en: ['What AI models launched this week?', 'Any major security breaches recently?', 'What is new with OpenAI?', 'Which Indian startups raised funding?'],
  hi: ['इस हफ्ते कौन से AI मॉडल लॉन्च हुए?', 'हाल में कोई बड़ा साइबर हमला हुआ?', 'OpenAI में नया क्या है?', 'किन भारतीय स्टार्टअप्स ने फंडिंग जुटाई?'],
}

/** Renders the answer, turning [1], [2] citation markers into links to the source articles. */
function Answer({ text, sources }) {
  const parts = text.split(/(\[\d+\])/g)
  return (
    <div className="space-y-3 leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) => {
        const m = /^\[(\d+)\]$/.exec(p)
        const src = m && sources[Number(m[1]) - 1]
        return src ? (
          <Link
            key={i}
            to={`/article/${src.slug}`}
            className="mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded-md bg-indigo-100 px-1 align-text-top text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/20 dark:text-indigo-300"
            title={src.title}
          >
            {m[1]}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        )
      })}
    </div>
  )
}

/** Only the articles the answer actually cites (keeping their [n] numbers); all of them if none are cited. */
function SourceList({ answer, sources, pick, label }) {
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
  const list = sources.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => cited.size === 0 || cited.has(s.n))
  if (!list.length) return null
  return (
    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
      <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">{label}</p>
      <ol className="space-y-1.5 text-sm">
        {list.map((s) => (
          <li key={s.slug} className="flex gap-2">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">[{s.n}]</span>
            <Link to={`/article/${s.slug}`} className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">
              {pick(s, 'title')}
            </Link>
            <span className="shrink-0 text-slate-400">· {s.source_name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function AskPage() {
  const { t, lang, pick } = useLang()
  const [q, setQ] = useState('')
  const [thread, setThread] = useState([]) // { question, answer?, sources?, error? }
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  useSeo({ title: t('askTitle') })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [thread])

  const ask = async (question) => {
    const text = question.trim()
    if (!text || busy) return
    setQ('')
    setBusy(true)
    setThread((th) => [...th, { question: text }])
    try {
      const res = await askQuestion(text, lang)
      setThread((th) => th.map((m, i) => (i === th.length - 1 ? { ...m, answer: res.answer, sources: res.sources } : m)))
    } catch (e) {
      setThread((th) => th.map((m, i) => (i === th.length - 1 ? { ...m, error: e.message || t('askError') } : m)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
          <ChatIcon className="h-7 w-7" />
        </div>
        <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">{t('askTitle')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">{t('askIntro')}</p>
      </div>

      {thread.length === 0 && (
        <div className="mb-6 grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS[lang].map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="surface px-4 py-3 text-left text-sm transition hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {thread.map((m, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-2.5 text-white dark:bg-white dark:text-slate-900">
                {m.question}
              </div>
            </div>
            <div className="surface p-5">
              {m.error ? (
                <p className="text-red-600">{m.error}</p>
              ) : m.answer === undefined ? (
                <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-indigo-500" /> {t('thinking')}
                </p>
              ) : (
                <>
                  <Answer text={m.answer} sources={m.sources || []} />
                  <SourceList answer={m.answer} sources={m.sources || []} pick={pick} label={t('sources')} />
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(q)
        }}
        className="sticky bottom-0 mt-8 bg-gradient-to-t from-slate-50 from-70% to-transparent pt-6 pb-4 dark:from-[#0a0d14]"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/40">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('askPlaceholder')}
            maxLength={300}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
          />
          <button
            type="submit"
            disabled={busy || !q.trim()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            <SendIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('askButton')}</span>
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">{t('askDisclaimer')}</p>
      </form>
    </div>
  )
}
