// Mirrors src/lib/categories.js of the website (keep in sync).
export type Category = { slug: string; label: string; label_hi: string; color: string }

export const CATEGORIES: Category[] = [
  { slug: 'ai', label: 'AI', label_hi: 'AI', color: '#8b5cf6' },
  { slug: 'models', label: 'AI Models', label_hi: 'AI मॉडल', color: '#6366f1' },
  { slug: 'tools', label: 'AI Tools', label_hi: 'AI टूल्स', color: '#0ea5e9' },
  { slug: 'gadgets', label: 'Gadgets', label_hi: 'गैजेट्स', color: '#f97316' },
  { slug: 'business', label: 'Tech Market', label_hi: 'टेक बाज़ार', color: '#10b981' },
  { slug: 'startups', label: 'Startups', label_hi: 'स्टार्टअप', color: '#ec4899' },
  { slug: 'developers', label: 'Developers', label_hi: 'डेवलपर्स', color: '#14b8a6' },
  { slug: 'security', label: 'Security', label_hi: 'साइबर सुरक्षा', color: '#f43f5e' },
]

export function getCategory(slug: string): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug, label: slug, label_hi: slug, color: '#64748b' }
}

export function categoryLabel(slug: string, lang: 'en' | 'hi') {
  const c = getCategory(slug)
  return lang === 'hi' ? c.label_hi : c.label
}
