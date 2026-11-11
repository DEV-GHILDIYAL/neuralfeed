import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ArticleRow } from '@/components/article'
import { Button, Empty, ErrorView, Loading, Screen, T } from '@/components/ui'
import { Article, getArticlesByIds } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { space } from '@/lib/theme'

export default function SavedScreen() {
  const insets = useSafeAreaInsets()
  const { bookmarks, clearBookmarks, t } = useApp()
  const [items, setItems] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = bookmarks.join(',')

  const load = useCallback(() => {
    setError(null)
    getArticlesByIds(key ? key.split(',') : [])
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [key])

  useFocusEffect(load)

  const visible = (items ?? []).filter((a) => bookmarks.includes(a.id))

  return (
    <Screen>
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg, gap: space.md }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
            <T style={{ fontSize: 24, fontWeight: '800' }}>
              {t('saved')} {bookmarks.length > 0 && <T muted style={{ fontSize: 16 }}>{bookmarks.length}</T>}
            </T>
            {bookmarks.length > 0 && <Button label={t('clearAll')} variant="outline" onPress={clearBookmarks} />}
          </View>
        }
        renderItem={({ item }) => <ArticleRow article={item} />}
        ListEmptyComponent={
          error ? (
            <ErrorView message={error} onRetry={load} />
          ) : bookmarks.length === 0 ? (
            <Empty icon="bookmark-outline" text={t('savedEmpty')} />
          ) : items === null ? (
            <Loading />
          ) : undefined
        }
      />
    </Screen>
  )
}
