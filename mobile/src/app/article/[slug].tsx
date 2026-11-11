import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'

import { ArticleImage, ArticleRow, BookmarkToggle } from '@/components/article'
import { ListenButton } from '@/components/listen-button'
import { Button, Card, CategoryTag, ErrorView, Loading, Screen, SectionTitle, T } from '@/components/ui'
import { Article, articleUrl, getArticle, getRelated, getStorySources } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { formatDateTime, toDayKey } from '@/lib/dates'
import { radius, space } from '@/lib/theme'

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { colors, pick, t, lang, bookmarks, toggleBookmark } = useApp()
  const [article, setArticle] = useState<Article | null | undefined>(undefined)
  const [related, setRelated] = useState<Article[]>([])
  const [sources, setSources] = useState<{ source_name: string; source_url: string; title: string | null }[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    setArticle(undefined)
    getArticle(slug)
      .then((a) => {
        setArticle(a)
        if (a) {
          getRelated(a).then(setRelated).catch(() => {})
          getStorySources(a.id).then(setSources).catch(() => {})
        }
      })
      .catch((e) => setError(e.message))
  }
  useEffect(load, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Screen><ErrorView message={error} onRetry={load} /></Screen>
  if (article === undefined) return <Screen><Loading /></Screen>
  if (article === null) return <Screen><ErrorView message="404" /></Screen>

  const title = pick(article, 'title')
  const summary = pick(article, 'summary')
  const content = pick(article, 'content') || ''
  const points = pick(article, 'key_points') || []
  const paragraphs = content.split(/\n{2,}/).filter(Boolean)
  const saved = bookmarks.includes(article.id)
  const minutes = Math.max(1, Math.round((article.content || '').split(/\s+/).length / 200))
  const share = () => Share.share({ message: `${title}\n\n${articleUrl(article.slug)}` }).catch(() => {})

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18, paddingRight: 4 }}>
              <BookmarkToggle id={article.id} size={22} />
              <Pressable onPress={share} hitSlop={8} accessibilityLabel={t('share')}>
                <Ionicons name="share-social-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <ArticleImage article={article} style={{ width: '100%', aspectRatio: 16 / 9 }} />
        <View style={{ padding: space.lg, gap: space.md }}>
          <CategoryTag slug={article.category} />
          <T style={styles.title}>{title}</T>
          <T soft style={styles.summary}>
            {summary}
          </T>

          <Pressable onPress={() => router.push(`/date/${toDayKey(article.published_at)}`)}>
            <T muted style={{ fontSize: 13 }}>
              <Text style={{ fontWeight: '700', color: colors.textSoft }}>{article.source_name}</Text>
              {'  ·  '}
              {formatDateTime(article.published_at, lang)}
              {'  ·  '}
              {minutes} {t('minRead')}
            </T>
          </Pressable>

          <View style={styles.actions}>
            <ListenButton text={[title, summary, ...paragraphs].join('. ')} />
            <Button label={saved ? t('savedBtn') : t('save')} icon={saved ? 'bookmark' : 'bookmark-outline'} variant="outline" onPress={() => toggleBookmark(article.id)} />
            <Button label={t('share')} icon="share-social-outline" variant="outline" onPress={share} />
          </View>

          {points.length > 0 && (
            <View style={[styles.points, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '33' }]}>
              <T style={{ color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: lang === 'hi' ? 0 : 1 }}>
                ✦ {lang === 'hi' ? t('keyPoints') : t('keyPoints').toUpperCase()}
              </T>
              {points.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                  <T style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>{p}</T>
                </View>
              ))}
            </View>
          )}

          {paragraphs.map((p, i) => (
            <T key={i} style={styles.paragraph}>
              {p}
            </T>
          ))}

          {!!article.tags?.length && (
            <View style={styles.tags}>
              {article.tags.map((tag) => (
                <Pressable key={tag} onPress={() => router.push({ pathname: '/search', params: { tag } })} style={[styles.tag, { backgroundColor: colors.cardAlt }]}>
                  <T soft style={{ fontSize: 13 }}>#{tag}</T>
                </Pressable>
              ))}
            </View>
          )}

          {sources.length > 0 && (
            <Card style={{ padding: space.lg, gap: space.sm }}>
              <T muted style={{ fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{t('alsoCoveredBy').toUpperCase()}</T>
              {sources.map((s) => (
                <Pressable key={s.source_url} onPress={() => WebBrowser.openBrowserAsync(s.source_url)} style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                  <T soft style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{s.source_name}</Text>
                    {s.title ? ` — ${s.title}` : ''}
                  </T>
                </Pressable>
              ))}
            </Card>
          )}

          <Card style={{ padding: space.lg, gap: space.md }}>
            <T muted style={{ fontSize: 13, lineHeight: 19 }}>🤖 {t('writtenByAi')}</T>
            {article.source_url && (
              <Button label={`${t('readOn')} ${article.source_name}`} icon="open-outline" onPress={() => WebBrowser.openBrowserAsync(article.source_url!)} />
            )}
          </Card>

          {related.length > 0 && (
            <View style={{ marginTop: space.md, gap: space.md }}>
              <SectionTitle>{t('related')}</SectionTitle>
              {related.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 33, fontWeight: '800' },
  summary: { fontSize: 17, lineHeight: 25 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  points: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  paragraph: { fontSize: 17, lineHeight: 28 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
})
