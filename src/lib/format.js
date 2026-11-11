export function timeAgo(dateInput, locale = 'en-IN') {
  const seconds = Math.round((new Date(dateInput).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) return rtf.format(Math.trunc(seconds / secs), unit)
  }
  return rtf.format(0, 'second')
}

export function formatDate(dateInput, locale = 'en-IN') {
  return new Date(dateInput).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function readingTime(text = '') {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200))
}
