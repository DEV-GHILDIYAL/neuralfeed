// Placeholder articles shown ONLY in demo mode (when Supabase env vars are not set),
// so the UI can be developed before the database exists. Clearly labelled as samples.

const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()

const sample = (id, category, title, summary, h) => ({
  id: String(id),
  slug: `sample-${id}`,
  title,
  summary,
  content:
    'This is placeholder text shown in demo mode. Once Supabase is connected and the AI pipeline has run, real AI-written news briefs will appear here.\n\nEach brief is generated from a real publisher\'s RSS item, and always links back to the original source.',
  key_points: ['Demo article — not real news', 'Connect Supabase to see live data', 'Run `npm run news:run` to generate articles'],
  category,
  tags: ['sample', category],
  image_url: null,
  source_name: 'Sample Source',
  source_url: 'https://example.com',
  published_at: hoursAgo(h),
  ai_provider: 'demo',
  ai_model: 'demo',
})

export const MOCK_ARTICLES = [
  sample(1, 'ai', 'Sample: How AI-written news briefs work on NeuralFeed', 'A placeholder headline showing what an AI-generated summary card looks like on the homepage.', 1),
  sample(2, 'models', 'Sample: A new AI model launch headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 2),
  sample(3, 'tools', 'Sample: An AI tools headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 3),
  sample(4, 'gadgets', 'Sample: A gadget launch headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 4),
  sample(5, 'business', 'Sample: A tech market headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 6),
  sample(6, 'startups', 'Sample: A startup funding headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 8),
  sample(7, 'developers', 'Sample: A developer news headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 10),
  sample(8, 'security', 'Sample: A cybersecurity headline goes here', 'Short one-to-two sentence summary written by the AI from the source snippet.', 12),
  sample(9, 'ai', 'Sample: Another AI headline for the grid', 'Short one-to-two sentence summary written by the AI from the source snippet.', 14),
]
