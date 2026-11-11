import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text } from 'react-native'

import { ArticleRow } from '@/components/article'
import { Empty, ErrorView, Loading, Screen } from '@/components/ui'
import { Article, getArticles } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { categoryLabel, getCategory } from '@/lib/categories'
import { radius, space } from '@/lib/theme'

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { lang, t, colors } = useApp()
  const cat = getCategory(slug)
  const [items, setItems] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (p: number, replace: boolean) => {
      try {
        setError(null)
        const { data, hasMore: more } = await getArticles({ page: p, category: slug })
        setItems((prev) => (replace ? data : [...prev, ...data]))
        setHasMore(more)
        setPage(p)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [slug],
  )
  useEffect(() => {
    load(0, true)
  }, [load])

  return (
    <Screen>
      <Stack.Screen options={{ title: categoryLabel(slug, lang) }} />
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        ListHeaderComponent={
          <LinearGradient colors={[cat.color, '#1e1b4b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl, marginBottom: space.sm }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{categoryLabel(slug, lang)}</Text>
          </LinearGradient>
        }
        renderItem={({ item }) => <ArticleRow article={item} />}
        ListEmptyComponent={loading ? <Loading /> : error ? <ErrorView message={error} onRetry={() => load(0, true)} /> : <Empty text={t('noArticles')} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => !loading && hasMore && items.length > 0 && load(page + 1, false)}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(0, true) }} />}
      />
    </Screen>
  )
}
