import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AppStateProvider, useApp } from '@/lib/app-state'

SplashScreen.preventAutoHideAsync()

function RootStack() {
  const { ready, dark, colors } = useApp()

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  const base = dark ? DarkTheme : DefaultTheme
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.bg, card: colors.card, text: colors.text, border: colors.border },
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="article/[slug]" options={{ title: '' }} />
        <Stack.Screen name="category/[slug]" options={{ title: '' }} />
        <Stack.Screen name="date/[day]" options={{ title: '' }} />
        <Stack.Screen name="models" options={{ title: '' }} />
        <Stack.Screen name="search" options={{ title: '' }} />
      </Stack>
    </ThemeProvider>
  )
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootStack />
    </AppStateProvider>
  )
}
