// Local-time day keys (YYYY-MM-DD) and small formatting helpers.
// Hermes' Intl support varies by platform, so relative time is formatted by hand.

const pad = (n: number) => String(n).padStart(2, '0')

export function toDayKey(date: Date | string = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDayKey(key?: string | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return toDayKey(d) === key ? d : null
}

export function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function dayRange(key: string): [string, string] {
  const start = parseDayKey(key)!
  return [start.toISOString(), addDays(start, 1).toISOString()]
}

export function monthRange(year: number, month: number): [string, string] {
  return [new Date(year, month, 1).toISOString(), new Date(year, month + 1, 1).toISOString()]
}

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
}
const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
}
export const WEEKDAY_SHORT = {
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  hi: ['सो', 'मं', 'बु', 'गु', 'शु', 'श', 'र'],
}

type Lang = 'en' | 'hi'

export const monthName = (m: number, lang: Lang) => MONTHS[lang][m]

export function formatDay(key: string, lang: Lang) {
  const d = parseDayKey(key)
  if (!d) return key
  const base = `${WEEKDAYS[lang][d.getDay()]}, ${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`
  if (key === toDayKey()) return `${lang === 'hi' ? 'आज' : 'Today'} · ${base}`
  if (key === toDayKey(addDays(new Date(), -1))) return `${lang === 'hi' ? 'कल' : 'Yesterday'} · ${base}`
  return base
}

export function formatDateTime(iso: string, lang: Lang) {
  const d = new Date(iso)
  const h = d.getHours()
  const time = `${((h + 11) % 12) + 1}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()].slice(0, lang === 'hi' ? undefined : 3)} ${d.getFullYear()}, ${time}`
}

export function timeAgo(iso: string, lang: Lang) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  const units: [number, string, string][] = [
    [31536000, 'y', 'साल'],
    [2592000, 'mo', 'महीने'],
    [86400, 'd', 'दिन'],
    [3600, 'h', 'घंटे'],
    [60, 'm', 'मिनट'],
  ]
  for (const [secs, en, hi] of units) {
    const n = Math.floor(s / secs)
    if (n >= 1) return lang === 'hi' ? `${n} ${hi} पहले` : `${n}${en} ago`
  }
  return lang === 'hi' ? 'अभी' : 'just now'
}
