import Ionicons from '@expo/vector-icons/Ionicons'
import Constants from 'expo-constants'
import { Href, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Card, Chip, Screen, T } from '@/components/ui'
import { useApp } from '@/lib/app-state'
import { CATEGORIES, categoryLabel } from '@/lib/categories'
import { toDayKey } from '@/lib/dates'
import { SITE_URL } from '@/lib/supabase'
import { radius, space } from '@/lib/theme'

const TELEGRAM_URL = 'https://t.me/ourneuralfeed'

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const { colors } = useApp()
  return (
    <View style={[styles.seg, { backgroundColor: colors.cardAlt }]}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segBtn, value === o.value && { backgroundColor: colors.card }]}>
          <T style={{ fontWeight: '700', fontSize: 13, color: value === o.value ? colors.text : colors.textMuted }}>{o.label}</T>
        </Pressable>
      ))}
    </View>
  )
}

function Row({ icon, color, title, sub, onPress, right }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; sub?: string; onPress?: () => void; right?: ReactNode }) {
  const { colors } = useApp()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '700', fontSize: 15 }}>{title}</T>
        {sub && (
          <T muted style={{ fontSize: 12, marginTop: 1 }}>
            {sub}
          </T>
        )}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  )
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, lang, setLang, theme, setTheme, topics, setTopics, colors } = useApp()
  const toggleTopic = (slug: string) => setTopics(topics.includes(slug) ? topics.filter((s) => s !== slug) : [...topics, slug])
  const go = (href: Href) => router.push(href)

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        <T style={{ fontSize: 24, fontWeight: '800' }}>{t('more')}</T>

        <Card style={{ padding: space.lg, gap: space.md }}>
          <T muted style={styles.label}>
            {t('settings')}
          </T>
          <T style={{ fontWeight: '700' }}>{t('language')}</T>
          <Segmented value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }]} />
          <T style={{ fontWeight: '700', marginTop: space.xs }}>{t('theme')}</T>
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('system') },
              { value: 'light', label: t('light') },
              { value: 'dark', label: t('dark') },
            ]}
          />
        </Card>

        <Card style={{ padding: space.lg, gap: space.md }}>
          <T muted style={styles.label}>
            {t('yourTopics')}
          </T>
          <T muted style={{ fontSize: 13 }}>{t('pickTopicsHint')}</T>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip key={c.slug} label={categoryLabel(c.slug, lang)} dot={c.color} active={topics.includes(c.slug)} onPress={() => toggleTopic(c.slug)} />
            ))}
          </View>
        </Card>

        <Card style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <Row icon="calendar" color="#6366f1" title={t('archive')} sub={t('archiveSub')} onPress={() => go(`/date/${toDayKey()}`)} />
          <Row icon="hardware-chip" color="#8b5cf6" title={t('models')} sub={t('modelsSub')} onPress={() => go('/models')} />
          <Row icon="search" color="#0ea5e9" title={t('search')} onPress={() => go('/search')} />
        </Card>

        <Card style={{ padding: space.lg, gap: space.md }}>
          <T muted style={styles.label}>
            {t('categories')}
          </T>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip key={c.slug} label={categoryLabel(c.slug, lang)} dot={c.color} onPress={() => go(`/category/${c.slug}`)} />
            ))}
          </View>
        </Card>

        <Card style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <Row icon="paper-plane" color="#229ED9" title={t('telegram')} sub={t('telegramSub')} onPress={() => Linking.openURL(TELEGRAM_URL)} />
          <Row icon="globe-outline" color="#10b981" title={t('website')} sub={SITE_URL.replace('https://', '')} onPress={() => WebBrowser.openBrowserAsync(SITE_URL)} />
        </Card>

        <T muted style={{ textAlign: 'center', fontSize: 12, lineHeight: 18 }}>
          {t('about')}
          {'\n'}v{Constants.expoConfig?.version ?? '1.0.0'}
        </T>
        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0 }} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  segBtn: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
