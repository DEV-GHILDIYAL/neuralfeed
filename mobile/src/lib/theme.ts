export const palette = {
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    cardAlt: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    textSoft: '#334155',
    accent: '#4f46e5',
    accentSoft: '#eef2ff',
    danger: '#dc2626',
  },
  dark: {
    bg: '#0a0d14',
    card: '#111521',
    cardAlt: '#161b29',
    border: '#1f2533',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textSoft: '#cbd5e1',
    accent: '#818cf8',
    accentSoft: '#1e1b4b',
    danger: '#f87171',
  },
}

export type Colors = typeof palette.light

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 }
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
