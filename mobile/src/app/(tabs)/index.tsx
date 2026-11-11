import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ArticleRow, LeadCard } from '@/components/article'
import { Chip, Empty, ErrorView, Loading, Screen, T } from '@/components/ui'
import { Article, getArticles } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { CATEGORIES, categoryLabel } from '@/lib/categories'
import { formatDay, toDayKey } from '@/lib/dates'
import { space } from '@/lib/theme'

type Mode = 'top' | 'foryou'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { colors, t, lang, setLang, topics } = useApp()
  const [mode, setMode] = useState<Mode>('top')
  const [category, setCategory] = useState('')
  const [items, setItems] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filters = useCallback(
    () => (mode === 'foryou' ? { categories: topics } : category ? { category } : {}),
    [mode, topics, category],
  )

  const load = useCallback(
    async (p: number, replace: boolean) => {
      if (mode === 'foryou' && topics.length === 0) {
        setItems([])
        setHasMore(false)
        setLoading(false)
        return
      }
      try {
        setError(null)
        const { data, hasMore: more } = await getArticles({ page: p, ...filters() })
        setItems((prev) => (replace ? data : [...prev, ...data.filter((d) => !prev.some((x) => x.id === d.id))]))
        setHasMore(more)
        setPage(p)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filters, mode, topics.length],
  )

  useEffect(() => {
    setLoading(true)
    load(0, true)
  }, [load])

  const [lead, ...rest] = items

  const header = (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <Ionicons name="git-network" size={18} color="#fff" />
          </View>
          <T style={styles.brand}>
            Neural<T style={[styles.brand, { color: colors.accent }]}>Feed</T>
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => router.push('/search')} hitSlop={8} style={[styles.iconBtn, { borderColor: colors.border }]} accessibilityLabel={t('search')}>
              <Ionicons name="search" size={18} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setLang(lang === 'en' ? 'hi' : 'en')} style={[styles.iconBtn, { borderColor: colors.border }]} accessibilityLabel={t('language')}>
            <T style={{ fontWeight: '800', fontSize: 13 }}>{lang === 'en' ? 'हिं' : 'EN'}</T>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
        <T style={{ color: colors.accent, fontWeight: '700', fontSize: 12, letterSpacing: lang === 'hi' ? 0 : 1.5 }}>
          {lang === 'hi' ? t('todaysBriefing') : t('todaysBriefing').toUpperCase()}
        </T>
        <T style={{ fontSize: 22, fontWeight: '800', marginTop: 2 }}>{formatDay(toDayKey(), lang).split(' · ').pop()}</T>
      </View>

      <View style={[styles.segment, { backgroundColor: colors.cardAlt }]}>
        {(['top', 'foryou'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, mode === m && { backgroundColor: colors.card }]}>
            <Ionicons name={m === 'top' ? 'flame' : 'star'} size={14} color={mode === m ? colors.accent : colors.textMuted} />
            <T style={{ fontWeight: '700', fontSize: 13, color: mode === m ? colors.text : colors.textMuted }}>{m === 'top' ? t('topStories') : t('forYou')}</T>
          </Pressable>
        ))}
      </View>

      {mode === 'top' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('all')} active={!category} onPress={() => setCategory('')} />
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} label={categoryLabel(c.slug, lang)} dot={c.color} active={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </ScrollView>
      )}

      {lead && (
        <View style={{ paddingHorizontal: space.lg, marginTop: space.sm, marginBottom: space.lg }}>
          <LeadCard article={lead} />
        </View>
      )}
    </View>
  )

  return (
    <Screen>
      <FlatList
        data={loading ? [] : rest}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ArticleRow article={item} style={{ marginHorizontal: space.lg, marginBottom: space.md }} />}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorView message={error} onRetry={() => load(0, true)} />
          ) : mode === 'foryou' && topics.length === 0 ? (
            <Empty icon="star-outline" text={t('noTopics')} />
          ) : lead ? undefined : (
            <Empty text={t('noArticles')} />
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => !loading && hasMore && items.length > 0 && load(page + 1, false)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true)
              load(0, true)
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: space.xxl }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  logo: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '800' },
  iconBtn: { height: 38, minWidth: 38, paddingHorizontal: 8, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', margin: space.lg, marginBottom: space.sm, padding: 4, borderRadius: 14 },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 10 },
  chips: { gap: 8, paddingHorizontal: space.lg, paddingVertical: space.sm },
})
