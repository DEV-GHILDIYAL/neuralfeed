import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { getDayCounts } from '@/lib/api'
import { useApp } from '@/lib/app-state'
import { monthName, parseDayKey, toDayKey, WEEKDAY_SHORT } from '@/lib/dates'

import { T } from './ui'

/** Month grid; days with articles are tappable and show a dot (bigger = more stories). */
export function Calendar({ selected, onPick }: { selected?: string; onPick: (dayKey: string) => void }) {
  const { colors, lang } = useApp()
  const todayKey = toDayKey()
  const initial = parseDayKey(selected) ?? new Date()
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() })
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    getDayCounts(view.y, view.m)
      .then((c) => !cancelled && setCounts(c))
      .catch(() => !cancelled && setCounts({}))
    return () => {
      cancelled = true
    }
  }, [view.y, view.m])

  const cells = useMemo(() => {
    const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7 // Monday first
    const days = new Date(view.y, view.m + 1, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, i) => toDayKey(new Date(view.y, view.m, i + 1))),
    ]
  }, [view])

  const now = new Date()
  const atCurrent = view.y === now.getFullYear() && view.m === now.getMonth()
  const max = Math.max(1, ...Object.values(counts))
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const shift = (d: number) =>
    setView(({ y, m }) => {
      const x = new Date(y, m + d, 1)
      return { y: x.getFullYear(), m: x.getMonth() }
    })

  return (
    <View>
      <View style={styles.head}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={colors.textSoft} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <T style={{ fontWeight: '700', fontSize: 16 }}>
            {monthName(view.m, lang)} {view.y}
          </T>
          <T muted style={{ fontSize: 12 }}>
            {total} {lang === 'hi' ? 'खबरें' : 'stories'}
          </T>
        </View>
        <Pressable onPress={() => shift(1)} disabled={atCurrent} hitSlop={10} accessibilityLabel="Next month" style={{ opacity: atCurrent ? 0.25 : 1 }}>
          <Ionicons name="chevron-forward" size={22} color={colors.textSoft} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAY_SHORT[lang].map((d, i) => (
          <View key={i} style={styles.cell}>
            <T muted style={{ fontSize: 12, fontWeight: '600' }}>
              {d}
            </T>
          </View>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />
          const count = counts[key] || 0
          const isSel = key === selected
          const enabled = count > 0
          const dot = enabled ? 4 + Math.round((count / max) * 3) : 0
          return (
            <View key={key} style={styles.cell}>
              <Pressable
                disabled={!enabled}
                onPress={() => onPick(key)}
                accessibilityLabel={`${key}: ${count}`}
                style={[
                  styles.day,
                  isSel && { backgroundColor: colors.accent },
                  key === todayKey && !isSel && { borderWidth: 1, borderColor: colors.accent },
                ]}
              >
                <Text style={{ color: isSel ? '#fff' : enabled ? colors.text : colors.textMuted + '66', fontWeight: enabled ? '700' : '400' }}>
                  {Number(key.slice(8))}
                </Text>
                {dot > 0 && <View style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: isSel ? '#fff' : colors.accent, marginTop: 2 }} />}
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
