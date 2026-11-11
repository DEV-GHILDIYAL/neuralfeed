import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, SectionList, StyleSheet, View } from 'react-native'

import { ArticleRow } from '@/components/article'
import { Calendar } from '@/components/calendar'
import { Card, Empty, ErrorView, Loading, Screen, T } from '@/components/ui'
import { Article, getArticlesForDay } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { CATEGORIES, categoryLabel, getCategory } from '@/lib/categories'
import { addDays, formatDay, parseDayKey, toDayKey } from '@/lib/dates'
import { space } from '@/lib/theme'

export default function DateScreen() {
  const { day } = useLocalSearchParams<{ day: string }>()
  const router = useRouter()
  const { lang, t, colors } = useApp()
  const date = parseDayKey(day)
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCal, setShowCal] = useState(false)

  useEffect(() => {
    if (!date) return
    setArticles(null)
    setError(null)
    getArticlesForDay(day)
      .then(setArticles)
      .catch((e) => setError(e.message))
  }, [day]) // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(
    () =>
      CATEGORIES.map((c) => ({ cat: c.slug, data: (articles ?? []).filter((a) => a.category === c.slug) }))
        .concat([{ cat: 'other', data: (articles ?? []).filter((a) => !CATEGORIES.some((c) => c.slug === a.category)) }])
        .filter((s) => s.data.length),
    [articles],
  )

  if (!date) return <Screen><ErrorView message="Invalid date" /></Screen>

  const prev = toDayKey(addDays(date, -1))
  const next = toDayKey(addDays(date, 1))
  const hasNext = next <= toDayKey()
  const go = (k: string) => router.setParams({ day: k })

  return (
    <Screen>
      <Stack.Screen options={{ title: t('archive') }} />
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Card style={styles.dayCard}>
              <Pressable onPress={() => go(prev)} hitSlop={10} style={[styles.arrow, { borderColor: colors.border }]}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => setShowCal((s) => !s)}>
                <T style={{ fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{formatDay(day, lang)}</T>
                <T muted style={{ fontSize: 12, marginTop: 2 }}>
                  {articles ? `${articles.length} ${articles.length === 1 ? t('story') : t('stories')}` : t('loading')} · 📅
                </T>
              </Pressable>
              <Pressable onPress={() => hasNext && go(next)} disabled={!hasNext} hitSlop={10} style={[styles.arrow, { borderColor: colors.border, opacity: hasNext ? 1 : 0.3 }]}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </Card>
            {showCal && (
              <Card style={{ padding: space.lg }}>
                <Calendar
                  selected={day}
                  onPick={(k) => {
                    setShowCal(false)
                    go(k)
                  }}
                />
              </Card>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <View style={[styles.dot, { backgroundColor: getCategory(section.cat).color }]} />
            <T style={{ fontSize: 18, fontWeight: '800' }}>{categoryLabel(section.cat, lang)}</T>
            <T muted>{section.data.length}</T>
          </View>
        )}
        renderItem={({ item }) => <ArticleRow article={item} />}
        ListEmptyComponent={
          error ? <ErrorView message={error} /> : articles === null ? <Loading /> : <Empty icon="calendar-outline" text={t('noStoriesDay')} />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  dayCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  arrow: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
})
