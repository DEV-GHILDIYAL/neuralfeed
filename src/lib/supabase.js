import { createClient } from '@supabase/supabase-js'

// Accepts both our own names (VITE_*) and the names the Vercel ↔ Supabase integration creates (NEXT_PUBLIC_*).
// Only the public URL + anon/publishable key ever reach the browser.
const env = import.meta.env
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const anonKey =
  env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'))

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
