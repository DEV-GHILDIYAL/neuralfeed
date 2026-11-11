import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

// Public values only (same as the website's VITE_ vars). Set them in mobile/.env — see .env.example.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

export const supabase = createClient(url || 'https://invalid.supabase.co', anonKey || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Website base URL — used for Ask AI (/api/ask) and share links. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://ourneuralfeed.vercel.app').replace(/\/$/, '')
