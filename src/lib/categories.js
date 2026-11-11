// Shared by the React app AND the news pipeline — keep this file plain JS (no JSX / browser APIs).
// NeuralFeed is a TECH & AI news site: every category is a tech beat.
// `hint` is shown to the AI so it picks the right category.

export const CATEGORIES = [
  { slug: 'ai', label: 'AI', label_hi: 'AI', color: 'violet', hint: 'AI industry news, AI companies, AI policy/regulation, AI research' },
  { slug: 'models', label: 'AI Models', label_hi: 'AI मॉडल', color: 'indigo', hint: 'new LLM / AI model releases, benchmarks, open-weight models, model updates (GPT, Gemini, Claude, Llama, etc.)' },
  { slug: 'tools', label: 'AI Tools', label_hi: 'AI टूल्स', color: 'sky', hint: 'AI apps, assistants, agents, AI features in products, developer AI tools' },
  { slug: 'gadgets', label: 'Gadgets', label_hi: 'गैजेट्स', color: 'orange', hint: 'phones, laptops, chips, consumer hardware, launches and reviews' },
  { slug: 'business', label: 'Tech Market', label_hi: 'टेक बाज़ार', color: 'emerald', hint: 'tech company earnings, stock market moves of tech firms, deals, acquisitions, layoffs' },
  { slug: 'startups', label: 'Startups', label_hi: 'स्टार्टअप', color: 'pink', hint: 'startup funding rounds, new startups, Indian tech startups, venture capital' },
  { slug: 'developers', label: 'Developers', label_hi: 'डेवलपर्स', color: 'teal', hint: 'programming, open source, cloud, software releases, developer platforms' },
  { slug: 'security', label: 'Security', label_hi: 'साइबर सुरक्षा', color: 'rose', hint: 'cybersecurity, hacks, data breaches, vulnerabilities, privacy' },
]

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug)

export function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug, label: slug, label_hi: slug, color: 'slate' }
}

export function categoryLabel(slug, lang = 'en') {
  const c = getCategory(slug)
  return lang === 'hi' ? c.label_hi || c.label : c.label
}
