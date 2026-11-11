import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'

import { Article } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { categoryLabel, getCategory } from '@/lib/categories'
import { timeAgo } from '@/lib/dates'
import { radius, space } from '@/lib/theme'

import { CategoryTag, T } from './ui'

export function ArticleImage({ article, style }: { article: Article; style?: StyleProp<ViewStyle> }) {
  const [broken, setBroken] = useState(false)
  const { lang } = useApp()
  const c = getCategory(article.category)
  if (!article.image_url || broken) {
    return (
      <LinearGradient colors={[c.color, '#1e1b4b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>{categoryLabel(article.category, lang)}</Text>
      </LinearGradient>
    )
  }
  return (
    <Image
      source={{ uri: article.image_url }}
      style={[{ backgroundColor: '#1e293b' }, style as object]}
      contentFit="cover"
      transition={200}
      onError={() => setBroken(true)}
      accessibilityIgnoresInvertColors
    />
  )
}

export function BookmarkToggle({ id, onImage, size = 18 }: { id: string; onImage?: boolean; size?: number }) {
  const { bookmarks, toggleBookmark, colors, t } = useApp()
  const saved = bookmarks.includes(id)
  return (
    <Pressable
      onPress={() => toggleBookmark(id)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={saved ? t('savedBtn') : t('save')}
      accessibilityState={{ selected: saved }}
      style={({ pressed }) => [
        onImage && styles.onImageBtn,
        onImage && { backgroundColor: saved ? colors.accent : 'rgba(0,0,0,0.45)' },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={size} color={onImage ? '#fff' : saved ? colors.accent : colors.textMuted} />
    </Pressable>
  )
}

function Meta({ article, light }: { article: Article; light?: boolean }) {
  const { lang, colors } = useApp()
  const color = light ? 'rgba(255,255,255,0.8)' : colors.textMuted
  return (
    <Text style={{ color, fontSize: 12, marginTop: 6 }} numberOfLines={1}>
      <Text style={{ fontWeight: '600', color: light ? '#fff' : colors.textSoft }}>{article.source_name}</Text>
      {'  ·  '}
      {timeAgo(article.published_at, lang)}
    </Text>
  )
}

/** Big hero card with image + gradient overlay. */
export function LeadCard({ article }: { article: Article }) {
  const { pick } = useApp()
  const router = useRouter()
  return (
      <Pressable onPress={() => router.push(`/article/${article.slug}`)} accessibilityRole="link" style={({ pressed }) => [styles.lead, { opacity: pressed ? 0.9 : 1 }]}>
        <ArticleImage article={article} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
        <View style={styles.leadTop}>
          <BookmarkToggle id={article.id} onImage />
        </View>
        <View style={styles.leadBody}>
          <CategoryTag slug={article.category} solid />
          <Text style={styles.leadTitle} numberOfLines={3}>
            {pick(article, 'title')}
          </Text>
          <Text style={styles.leadSummary} numberOfLines={2}>
            {pick(article, 'summary')}
          </Text>
          <Meta article={article} light />
        </View>
      </Pressable>
  )
}

/** List row: thumbnail + headline. */
export function ArticleRow({ article, style }: { article: Article; style?: StyleProp<ViewStyle> }) {
  const { pick, colors } = useApp()
  const router = useRouter()
  return (
      <Pressable onPress={() => router.push(`/article/${article.slug}`)} accessibilityRole="link" style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }, style]}>
        <ArticleImage article={article} style={styles.thumb} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <CategoryTag slug={article.category} />
          <T style={styles.rowTitle} numberOfLines={3}>
            {pick(article, 'title')}
          </T>
          <Meta article={article} />
        </View>
        <BookmarkToggle id={article.id} />
      </Pressable>
  )
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fallbackText: { color: 'rgba(255,255,255,0.92)', fontWeight: '800', fontSize: 16 },
  onImageBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lead: { height: 380, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#0f172a' },
  leadTop: { position: 'absolute', top: space.md, right: space.md },
  leadBody: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg + 2, gap: 8 },
  leadTitle: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  leadSummary: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  thumb: { width: 96, height: 84, borderRadius: radius.md },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', marginTop: 6 },
})
