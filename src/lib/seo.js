// Client-side head tags. Crawlers get the same tags from the prerendered HTML
// (scripts/prerender.js); this keeps them right while the user navigates the SPA.
import { useEffect } from 'react'

export const SITE_NAME = 'NeuralFeed'
export const DEFAULT_DESCRIPTION = 'Daily AI & tech news — new AI models, launches, gadgets, startups and security — summarized by AI from trusted sources.'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export function useSeo({ title, description = DEFAULT_DESCRIPTION, image, type = 'website' } = {}) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — AI & tech news, daily`
    document.title = full
    const url = window.location.origin + window.location.pathname
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', image || null)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setCanonical(url)
  }, [title, description, image, type])
}
