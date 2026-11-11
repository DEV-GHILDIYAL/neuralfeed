import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router/tabs'
import { ColorValue, StyleSheet } from 'react-native'

import { useApp } from '@/lib/app-state'

type IconName = keyof typeof Ionicons.glyphMap

const icon =
  (on: IconName, off: IconName) =>
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} size={size} color={color as string} />

export default function TabsLayout() {
  const { colors, t } = useApp()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: icon('newspaper', 'newspaper-outline') }} />
      <Tabs.Screen name="shorts" options={{ title: t('shorts'), tabBarIcon: icon('flash', 'flash-outline') }} />
      <Tabs.Screen name="ask" options={{ title: t('ask'), tabBarIcon: icon('chatbubbles', 'chatbubbles-outline') }} />
      <Tabs.Screen name="saved" options={{ title: t('saved'), tabBarIcon: icon('bookmark', 'bookmark-outline') }} />
      <Tabs.Screen name="more" options={{ title: t('more'), tabBarIcon: icon('grid', 'grid-outline') }} />
    </Tabs>
  )
}
