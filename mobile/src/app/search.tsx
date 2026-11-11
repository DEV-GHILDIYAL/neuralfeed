import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { FlatList, TextInput, View } from 'react-native'

import { ArticleRow } from '@/components/article'
import { Empty, ErrorView, Loading, Screen } from '@/components/ui'
import { Article, getArticles } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { radius, space } from '@/lib/theme'

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; tag?: string }>()
  const { t, colors } = useApp()
  const [input, setInput] = useState(params.q ?? '')
  const [query, setQuery] = useState({ q: params.q ?? '', tag: params.tag ?? '' })
  const [items, setItems] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.q && !query.tag) {
      setItems(null)
      return
    }
    setItems(null)
    setError(null)
    getArticles({ search: query.q || undefined, tag: query.tag || undefined, pageSize: 40 })
      .then((r) => setItems(r.data))
      .catch((e) => setError(e.message))
  }, [query])

  return (
    <Screen>
      <Stack.Screen options={{ title: query.tag ? `#${query.tag}` : t('search') }} />
      <View style={{ padding: space.lg, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.lg }}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus={!params.tag}
            returnKeyType="search"
            onSubmitEditing={() => input.trim() && setQuery({ q: input.trim(), tag: '' })}
            style={{ flex: 1, height: 46, marginLeft: 8, color: colors.text, fontSize: 15 }}
          />
        </View>
      </View>
      <FlatList
        data={items ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <ArticleRow article={item} />}
        ListEmptyComponent={
          error ? (
            <ErrorView message={error} />
          ) : !query.q && !query.tag ? undefined : items === null ? (
            <Loading />
          ) : (
            <Empty icon="search-outline" text={t('nothingFound')} />
          )
        }
      />
    </Screen>
  )
}
