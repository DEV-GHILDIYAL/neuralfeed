import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, LayoutChangeEvent, Pressable, ListViewToken, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ArticleImage, BookmarkToggle } from '@/components/article'
import { ListenButton } from '@/components/listen-button'
import { CategoryTag, Chip, ErrorView, Loading, Screen, T } from '@/components/ui'
import { Article, articleUrl, getArticles } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { CATEGORIES, categoryLabel } from '@/lib/categories'
import { timeAgo } from '@/lib/dates'
import { radius, space } from '@/lib/theme'

function ShortCard({ article, height, index }: { article: Article; height: number; index: number }) {
  const { colors, pick, lang, t } = useApp()
  const router = useRouter()
  const title = pick(article, 'title')
  const summary = pick(article, 'summary')
  const points = (pick(article, 'key_points') || []).slice(0, 3)

  const share = () => Share.share({ message: `${title}\n\n${articleUrl(article.slug)}` }).catch(() => {})

  return (
    <View style={{ height, paddingHorizontal: space.md, paddingVertical: space.sm }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.imageWrap}>
          <ArticleImage article={article} style={StyleSheet.absoluteFill} />
          <View style={styles.imageTop}>
            <CategoryTag slug={article.category} solid />
            <BookmarkToggle id={article.id} onImage />
          </View>
        </View>

        <View style={styles.body}>
          <T style={styles.title}>{title}</T>
          <ScrollView style={{ flex: 1, marginTop: space.sm }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <T soft style={styles.summary}>
              {summary}
            </T>
            {points.map((p, i) => (
              <View key={i} style={styles.point}>
                <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                <T soft style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
                  {p}
                </T>
              </View>
            ))}
          </ScrollView>

          <T muted style={{ fontSize: 12, marginTop: space.sm }}>
            <Text style={{ fontWeight: '700', color: colors.textSoft }}>{article.source_name}</Text>
            {'  ·  '}
            {timeAgo(article.published_at, lang)}
            {'  ·  '}#{index + 1}
          </T>

          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <ListenButton text={[title, summary, ...points].join('. ')} compact />
            <Pressable onPress={share} style={[styles.actionBtn, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={t('share')}>
              <Ionicons name="share-social-outline" size={17} color={colors.textSoft} />
            </Pressable>
            <Pressable onPress={() => router.push(`/article/${article.slug}`)} style={styles.readMore} accessibilityRole="link">
              <T style={{ color: colors.accent, fontWeight: '700' }}>{t('readFull')}</T>
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

export default function ShortsScreen() {
  const insets = useSafeAreaInsets()
  const { colors, t, lang } = useApp()
  const [height, setHeight] = useState(0)
  const [items, setItems] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const listRef = useRef<FlatList<Article>>(null)
  const [active, setActive] = useState(0)

  const load = useCallback(
    async (p: number, replace: boolean) => {
      try {
        setError(null)
        const { data, hasMore: more } = await getArticles({ page: p, category: category || undefined, withPoints: true })
        setItems((prev) => (replace ? data : [...prev, ...data.filter((d) => !prev.some((x) => x.id === d.id))]))
        setHasMore(more)
        setPage(p)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [category],
  )

  useEffect(() => {
    setLoading(true)
    setActive(0)
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
    load(0, true)
  }, [load])

  const onViewable = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    if (viewableItems[0]?.index != null) setActive(viewableItems[0].index)
  }).current

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height))

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + space.xs }}>
        <View style={styles.headRow}>
          <Ionicons name="flash" size={20} color="#f59e0b" />
          <T style={{ fontSize: 20, fontWeight: '800' }}>{t('shorts')}</T>
          {items.length > 0 && (
            <T muted style={{ marginLeft: 'auto', fontSize: 12 }}>
              {active + 1} / {items.length}
              {hasMore ? '+' : ''}
            </T>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('all')} active={!category} onPress={() => setCategory('')} />
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} label={categoryLabel(c.slug, lang)} dot={c.color} active={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorView message={error} onRetry={() => load(0, true)} />
        ) : (
          <FlatList
            onLayout={onLayout}
            style={{ flex: 1 }}
            ref={listRef}
            data={items}
            keyExtractor={(a) => a.id}
            renderItem={({ item, index }) => (height > 0 ? <ShortCard article={item} height={height} index={index} /> : null)}
            pagingEnabled
            snapToInterval={height || undefined}
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            onEndReachedThreshold={2}
            onEndReached={() => hasMore && load(page + 1, false)}
            windowSize={5}
            ListFooterComponent={
              !hasMore && items.length > 0 ? (
                <View style={{ height, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
                  <Text style={{ fontSize: 48 }}>🎉</Text>
                  <T style={{ fontSize: 22, fontWeight: '800', marginTop: space.sm }}>{t('allCaughtUp')}</T>
                  <T muted style={{ marginTop: 4 }}>
                    {t('allCaughtUpSub')}
                  </T>
                </View>
              ) : undefined
            }
          />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg },
  chips: { gap: 8, paddingHorizontal: space.lg, paddingVertical: space.sm },
  card: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  imageWrap: { height: '36%', minHeight: 150, backgroundColor: '#0f172a' },
  imageTop: { position: 'absolute', top: space.md, left: space.md, right: space.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, padding: space.lg },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  summary: { fontSize: 15, lineHeight: 22 },
  point: { flexDirection: 'row', gap: 10, marginTop: space.md },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.md, paddingTop: space.md },
  actionBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  readMore: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 38 },
})
