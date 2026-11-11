import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'

import { Card, Chip, Empty, ErrorView, Loading, Screen, T } from '@/components/ui'
import { AiModel, getModels } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { radius, space } from '@/lib/theme'

const TYPE_COLOR: Record<string, string> = { 'open-weights': '#10b981', closed: '#64748b', api: '#0ea5e9', unknown: '#94a3b8' }

export default function ModelsScreen() {
  const router = useRouter()
  const { t, colors } = useApp()
  const [models, setModels] = useState<AiModel[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')

  useEffect(() => {
    getModels().then(setModels).catch((e) => setError(e.message))
  }, [])

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (models ?? []).filter((m) => (type === 'all' || m.release_type === type) && (!n || `${m.name} ${m.company}`.toLowerCase().includes(n)))
  }, [models, q, type])

  return (
    <Screen>
      <Stack.Screen options={{ title: t('models') }} />
      <FlatList
        data={rows}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <LinearGradient colors={['#7c3aed', '#4f46e5', '#0284c7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl }}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>🤖 {t('models')}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{t('modelsSub')}</Text>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: space.md }}>{models?.length ?? '–'}</Text>
            </LinearGradient>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Gemini, OpenAI, Llama…"
              placeholderTextColor={colors.textMuted}
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.lg, height: 44, color: colors.text }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['all', 'open-weights', 'closed', 'api'].map((ty) => (
                <Chip key={ty} label={ty === 'all' ? t('all') : ty} active={type === ty} onPress={() => setType(ty)} />
              ))}
            </View>
          </View>
        }
        renderItem={({ item: m }) => (
          <Pressable disabled={!m.article?.slug} onPress={() => m.article && router.push(`/article/${m.article.slug}`)}>
            <Card style={{ padding: space.lg, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T style={{ fontSize: 17, fontWeight: '800', flex: 1 }}>{m.name}</T>
                <View style={{ backgroundColor: (TYPE_COLOR[m.release_type] ?? '#94a3b8') + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                  <Text style={{ color: TYPE_COLOR[m.release_type] ?? '#94a3b8', fontWeight: '700', fontSize: 11 }}>{m.release_type}</Text>
                </View>
              </View>
              <T muted style={{ fontSize: 13 }}>
                {[m.company, m.modality, m.parameters, m.context_window].filter(Boolean).join(' · ')}
              </T>
              {m.summary && <T soft style={{ fontSize: 14, lineHeight: 20 }}>{m.summary}</T>}
              <T muted style={{ fontSize: 12 }}>
                {new Date(m.announced_at).toDateString()}
                {m.article ? `  ·  ${m.article.source_name} →` : ''}
              </T>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={error ? <ErrorView message={error} /> : models === null ? <Loading /> : <Empty icon="hardware-chip-outline" text={t('noModels')} />}
      />
    </Screen>
  )
}
