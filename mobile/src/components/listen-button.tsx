import Ionicons from '@expo/vector-icons/Ionicons'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'

import { useApp } from '@/lib/app-state'

/** Reads text aloud with the device's built-in voices (free, offline). */
export function ListenButton({ text, compact }: { text: string; compact?: boolean }) {
  const { lang, t, dark } = useApp()
  const [speaking, setSpeaking] = useState(false)

  // stop when leaving the screen / changing article or language
  useEffect(() => {
    return () => {
      Speech.stop()
    }
  }, [text, lang])

  const toggle = () => {
    if (speaking) {
      Speech.stop()
      setSpeaking(false)
      return
    }
    Speech.stop()
    setSpeaking(true)
    Speech.speak(text, {
      language: lang === 'hi' ? 'hi-IN' : 'en-IN',
      rate: 1,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    })
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        compact && styles.compact,
        { backgroundColor: dark ? '#fff' : '#0f172a', opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={speaking ? 'stop' : 'headset'} size={15} color={dark ? '#0f172a' : '#fff'} />
      <Text style={{ color: dark ? '#0f172a' : '#fff', fontWeight: '700', fontSize: 13 }}>{speaking ? t('stop') : t('listen')}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 16, borderRadius: 999 },
  compact: { height: 36, paddingHorizontal: 14 },
})
