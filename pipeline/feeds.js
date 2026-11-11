// Tech & AI news sources. The AI never invents news — it only rewrites items from these feeds,
// and it also rejects any item that isn't actually about technology/AI.
// `category` is a hint; the AI picks the final category. Add / remove feeds freely.

export const FEEDS = [
  // AI industry
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'ai' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: 'ai' },
  { name: 'Ars Technica AI', url: 'https://arstechnica.com/ai/feed/', category: 'ai' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', category: 'ai' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', category: 'ai' },

  // AI models — official lab blogs + model hub
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', category: 'models' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', category: 'models' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'models' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'models' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', category: 'models' },

  // Gadgets / consumer tech
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'gadgets' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'gadgets' },
  { name: 'Gadgets 360', url: 'https://feeds.feedburner.com/gadgets360-latest', category: 'gadgets' },

  // Tech market / business
  { name: 'CNBC Tech', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', category: 'business' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'business' },

  // Startups (incl. India)
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/', category: 'startups' },
  { name: 'Inc42', url: 'https://inc42.com/feed/', category: 'startups' },

  // Developers
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', category: 'developers' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'developers' },

  // Security
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', category: 'security' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', category: 'security' },
]

// Items whose titles match these are skipped before they ever reach the AI (saves free-tier quota).
export const JUNK_TITLE_PATTERNS = [
  /\bquiz(zes)?\b/i,
  /\bcrossword\b|\bwordle\b|\bconnections hint/i,
  /^(live|watch|listen)[:\s]/i,
  /\bin pictures\b|\bphotos of the week\b/i,
  /\b(deal|deals|discount|% off|sale)\b.*\$|\bbest .* deals\b|\bprime day\b|\bblack friday\b/i,
  /\bpodcast\b|\bnewsletter\b|\bweek in review\b/i,
  /\bsponsored\b|\bpartner content\b/i,
]
