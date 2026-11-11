// Date helpers. A "day key" is a local-time YYYY-MM-DD string, used in URLs (/date/2026-11-11)
// and as the key for calendar counts. All ranges are in the viewer's local timezone.

const pad = (n) => String(n).padStart(2, '0')

export function toDayKey(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parses "YYYY-MM-DD" → local Date at 00:00, or null if invalid. */
export function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return toDayKey(d) === key ? d : null
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** [startISO, endISO) covering one local day. */
export function dayRange(key) {
  const start = parseDayKey(key)
  return [start.toISOString(), addDays(start, 1).toISOString()]
}

/** [startISO, endISO) covering one local month. */
export function monthRange(year, month) {
  return [new Date(year, month, 1).toISOString(), new Date(year, month + 1, 1).toISOString()]
}

export function isToday(key) {
  return key === toDayKey()
}

export function formatDayLong(key, locale = 'en-IN') {
  const d = parseDayKey(key)
  if (!d) return key
  const today = toDayKey()
  const yesterday = toDayKey(addDays(new Date(), -1))
  const full = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1)
  if (key === today) return `${cap(rtf.format(0, 'day'))} · ${full}`
  if (key === yesterday) return `${cap(rtf.format(-1, 'day'))} · ${full}`
  return full
}
