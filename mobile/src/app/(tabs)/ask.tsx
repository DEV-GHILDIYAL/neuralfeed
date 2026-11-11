import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Card, Screen, T } from '@/components/ui'
import { askQuestion, AskResult } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { radius, space } from '@/lib/theme'

const SUGGESTIONS = {
  en: ['What AI models launched this week?', 'Any major security breaches recently?', 'What is new with OpenAI?', 'Which Indian startups raised funding?'],
  hi: ['इस हफ्ते कौन से AI मॉडल लॉन्च हुए?', 'हाल में कोई बड़ा साइबर हमला हुआ?', 'OpenAI में नया क्या है?', 'किन भारतीय स्टार्टअप्स ने फंडिंग जुटाई?'],
}

type Msg = { question: string; result?: AskResult; error?: string }

/** Answer text with [n] citations rendered as tappable chips. */
function Answer({ result }: { result: AskResult }) {
  const { colors, lang } = useApp()
  const router = useRouter()
  const parts = result.answer.split(/(\[\d+\])/g)
  const cited = new Set([...result.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
  const sources = result.sources.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => cited.size === 0 || cited.has(s.n))

  return (
    <View>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>
        {parts.map((p, i) => {
          const m = /^\[(\d+)\]$/.exec(p)
          const src = m && result.sources[Number(m[1]) - 1]
          return src ? (
            <Text key={i} onPress={() => router.push(`/article/${src.slug}`)} style={{ color: colors.accent, fontWeight: '800' }}>
              {` [${m![1]}]`}
            </Text>
          ) : (
            <Text key={i}>{p}</Text>
          )
        })}
      </Text>
      {sources.length > 0 && (
        <View style={[styles.sources, { borderTopColor: colors.border }]}>
          {sources.map((s) => (
            <Pressable key={s.slug} onPress={() => router.push(`/article/${s.slug}`)} style={styles.sourceRow}>
              <T style={{ color: colors.accent, fontWeight: '800' }}>[{s.n}]</T>
              <T soft style={{ flex: 1 }} numberOfLines={2}>
                {(lang === 'hi' && s.title_hi) || s.title}
                <Text style={{ color: colors.textMuted }}> · {s.source_name}</Text>
              </T>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

export default function AskScreen() {
  const insets = useSafeAreaInsets()
  const { colors, t, lang } = useApp()
  const [q, setQ] = useState('')
  const [thread, setThread] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const scroll = useRef<ScrollViewInstance>(null)

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setQ('')
    setBusy(true)
    setThread((th) => [...th, { question }])
    try {
      const result = await askQuestion(question, lang)
      setThread((th) => th.map((m, i) => (i === th.length - 1 ? { ...m, result } : m)))
    } catch (e) {
      setThread((th) => th.map((m, i) => (i === th.length - 1 ? { ...m, error: (e as Error).message } : m)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg, gap: space.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Ionicons name="chatbubbles" size={26} color="#fff" />
            </View>
            <T style={{ fontSize: 24, fontWeight: '800', marginTop: space.md }}>{t('askTitle')}</T>
            <T muted style={{ textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              {t('askIntro')}
            </T>
          </View>

          {thread.length === 0 &&
            SUGGESTIONS[lang].map((s) => (
              <Pressable key={s} onPress={() => ask(s)}>
                <Card style={{ padding: space.md }}>
                  <T soft>{s}</T>
                </Card>
              </Pressable>
            ))}

          {thread.map((m, i) => (
            <View key={i} style={{ gap: space.sm }}>
              <View style={[styles.bubble, { backgroundColor: colors.text }]}>
                <Text style={{ color: colors.bg, fontSize: 15 }}>{m.question}</Text>
              </View>
              <Card style={{ padding: space.lg }}>
                {m.error ? (
                  <T style={{ color: colors.danger }}>{m.error}</T>
                ) : m.result ? (
                  <Answer result={m.result} />
                ) : (
                  <T muted>{t('thinking')}</T>
                )}
              </Card>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('askPlaceholder')}
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => ask(q)}
            returnKeyType="send"
            maxLength={300}
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardAlt }]}
          />
          <Pressable
            onPress={() => ask(q)}
            disabled={busy || !q.trim()}
            style={[styles.send, { backgroundColor: colors.accent, opacity: busy || !q.trim() ? 0.4 : 1 }]}
            accessibilityLabel={t('ask')}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
        <T muted style={{ fontSize: 11, textAlign: 'center', paddingBottom: 6, backgroundColor: colors.card }}>
          {t('askDisclaimer')}
        </T>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  badge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bubble: { alignSelf: 'flex-end', maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, borderBottomRightRadius: 6 },
  sources: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.md, paddingTop: space.md, gap: 8 },
  sourceRow: { flexDirection: 'row', gap: 8 },
  inputBar: { flexDirection: 'row', gap: 8, padding: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, height: 46, borderRadius: radius.pill, paddingHorizontal: space.lg, fontSize: 15 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
})
