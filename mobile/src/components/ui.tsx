import Ionicons from '@expo/vector-icons/Ionicons'
import { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native'

import { useApp } from '@/lib/app-state'
import { categoryLabel, getCategory } from '@/lib/categories'
import { radius, space } from '@/lib/theme'

export function T({ style, muted, soft, ...props }: TextProps & { muted?: boolean; soft?: boolean }) {
  const { colors } = useApp()
  return <Text {...props} style={[{ color: muted ? colors.textMuted : soft ? colors.textSoft : colors.text }, style]} />
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp()
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp()
  return (
    <View style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg }, style]}>
      {children}
    </View>
  )
}

export function Chip({ label, active, onPress, dot }: { label: string; active?: boolean; onPress?: () => void; dot?: string }) {
  const { colors, dark } = useApp()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? (dark ? '#fff' : '#0f172a') : colors.card,
          borderColor: active ? 'transparent' : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Text style={{ color: active ? (dark ? '#0f172a' : '#fff') : colors.textSoft, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  )
}

export function CategoryTag({ slug, solid }: { slug: string; solid?: boolean }) {
  const { lang } = useApp()
  const c = getCategory(slug)
  return (
    <View style={[styles.tag, { backgroundColor: solid ? c.color : c.color + '22' }]}>
      <Text style={{ color: solid ? '#fff' : c.color, fontSize: 11, fontWeight: '700', letterSpacing: lang === 'hi' ? 0 : 0.6 }}>
        {lang === 'hi' ? categoryLabel(slug, 'hi') : categoryLabel(slug, 'en').toUpperCase()}
      </Text>
    </View>
  )
}

export function Loading() {
  const { colors } = useApp()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors, t } = useApp()
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
      <T style={{ marginTop: space.sm, fontWeight: '600' }}>{t('couldntLoad')}</T>
      <T muted style={{ marginTop: 4, textAlign: 'center' }} numberOfLines={3}>
        {message}
      </T>
      {onRetry && <Button label={t('retry')} onPress={onRetry} style={{ marginTop: space.lg }} />}
    </View>
  )
}

export function Empty({ icon = 'newspaper-outline', text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useApp()
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={36} color={colors.textMuted} />
      <T muted style={{ marginTop: space.sm, textAlign: 'center' }}>
        {text}
      </T>
    </View>
  )
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'solid',
  style,
}: {
  label: string
  onPress?: () => void
  icon?: keyof typeof Ionicons.glyphMap
  variant?: 'solid' | 'outline' | 'ghost'
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useApp()
  const solid = variant === 'solid'
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: solid ? colors.accent : 'transparent',
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={solid ? '#fff' : colors.accent} />}
      <Text style={{ color: solid ? '#fff' : variant === 'outline' ? colors.textSoft : colors.accent, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  )
}

export function SectionTitle({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.sectionRow}>
      <T style={[styles.sectionTitle, style]}>{children}</T>
      {right}
    </View>
  )
}

export const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 240 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, height: 40, borderRadius: radius.pill, borderWidth: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
})
