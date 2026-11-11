import Ionicons from '@expo/vector-icons/Ionicons'
import * as WebBrowser from 'expo-web-browser'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useApp } from '@/lib/app-state'
import { radius, space } from '@/lib/theme'
import {
  checkForUpdate,
  cleanUpdateCache,
  currentVersion,
  downloadUpdate,
  installUpdate,
  RELEASES_URL,
  UpdateInfo,
  updatesSupported,
} from '@/lib/updates'

type Phase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'uptodate'

type Ctx = {
  phase: Phase
  info: UpdateInfo | null
  /** Manual check (from the More screen). */
  checkNow: () => Promise<void>
  supported: boolean
  version: string
}

const UpdateContext = createContext<Ctx | null>(null)

const mb = (b: number) => (b > 0 ? `${(b / 1048576).toFixed(1)} MB` : '')

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { colors, lang } = useApp()
  const hi = lang === 'hi'
  const [phase, setPhase] = useState<Phase>('idle')
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const busy = useRef(false)

  const run = useCallback(async (force: boolean) => {
    if (!updatesSupported || busy.current) return
    busy.current = true
    if (force) setPhase('checking')
    try {
      const found = await checkForUpdate({ force })
      if (found) {
        setInfo(found)
        setPhase('available')
        setVisible(true)
      } else {
        setPhase(force ? 'uptodate' : 'idle')
        if (!force) cleanUpdateCache()
      }
    } catch (e) {
      // silent on automatic checks; shown on manual checks
      if (force) {
        setError((e as Error).message)
        setPhase('error')
      } else setPhase('idle')
    } finally {
      busy.current = false
    }
  }, [])

  // automatic check on launch and whenever the app comes back to the foreground (throttled to 6h)
  useEffect(() => {
    run(false)
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run(false))
    return () => sub.remove()
  }, [run])

  const download = async () => {
    if (!info) return
    setPhase('downloading')
    setProgress(0)
    setError(null)
    try {
      const uri = await downloadUpdate(info, setProgress)
      setFile(uri)
      setPhase('ready')
      await installUpdate(uri) // opens the system installer straight away
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    }
  }

  const install = async () => {
    if (!file) return
    try {
      await installUpdate(file)
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    }
  }

  const value = useMemo<Ctx>(
    () => ({
      phase,
      info,
      supported: updatesSupported,
      version: currentVersion(),
      checkNow: async () => {
        await run(true)
      },
    }),
    [phase, info, run],
  )

  const notes = (info?.notes || '').replace(/\r/g, '').slice(0, 1200)

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <Modal visible={visible && !!info} transparent animationType="fade" onRequestClose={() => {
          if (phase !== 'downloading') setVisible(false)
        }}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.icon, { backgroundColor: colors.accent }]}>
              <Ionicons name={phase === 'ready' ? 'checkmark' : 'rocket'} size={28} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {phase === 'ready' ? (hi ? 'अपडेट तैयार है' : 'Update ready to install') : hi ? 'नया अपडेट आया है! 🎉' : 'New update available! 🎉'}
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
              v{currentVersion()} → <Text style={{ color: colors.accent, fontWeight: '800' }}>v{info?.version}</Text>
              {info?.sizeBytes ? `  ·  ${mb(info.sizeBytes)}` : ''}
            </Text>

            {!!notes && (
              <ScrollView style={[styles.notes, { backgroundColor: colors.cardAlt }]} contentContainerStyle={{ padding: space.md }}>
                <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>{hi ? 'नया क्या है' : "WHAT'S NEW"}</Text>
                <Text style={{ color: colors.textSoft, lineHeight: 20 }}>{notes}</Text>
              </ScrollView>
            )}

            {phase === 'downloading' && (
              <View style={{ width: '100%', marginTop: space.lg }}>
                <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
                  <View style={[styles.bar, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.accent }]} />
                </View>
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  {hi ? 'डाउनलोड हो रहा है' : 'Downloading'} {Math.round(progress * 100)}%
                </Text>
              </View>
            )}

            {phase === 'error' && (
              <Text style={{ color: colors.danger, textAlign: 'center', marginTop: space.md }}>
                {error}
                {'\n'}
                <Text style={{ color: colors.accent, fontWeight: '700' }} onPress={() => WebBrowser.openBrowserAsync(info?.pageUrl || RELEASES_URL)}>
                  {hi ? 'ब्राउज़र में डाउनलोड करें' : 'Download in browser instead'}
                </Text>
              </Text>
            )}

            <View style={styles.actions}>
              {phase !== 'downloading' && (
                <Pressable onPress={() => setVisible(false)} style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={{ color: colors.textSoft, fontWeight: '700' }}>{hi ? 'बाद में' : 'Later'}</Text>
                </Pressable>
              )}
              {(phase === 'available' || phase === 'error') && (
                <Pressable onPress={download} style={[styles.btn, styles.primary, { backgroundColor: colors.accent }]}>
                  <Ionicons name="download" size={18} color="#fff" />
                  <Text style={styles.primaryText}>{hi ? 'अभी डाउनलोड करें' : 'Download now'}</Text>
                </Pressable>
              )}
              {phase === 'ready' && (
                <Pressable onPress={install} style={[styles.btn, styles.primary, { backgroundColor: colors.accent }]}>
                  <Ionicons name="construct" size={18} color="#fff" />
                  <Text style={styles.primaryText}>{hi ? 'इंस्टॉल करें' : 'Install'}</Text>
                </Pressable>
              )}
            </View>
            {phase === 'ready' && (
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: space.md }}>
                {hi
                  ? 'पहली बार Android "इस सोर्स से ऐप इंस्टॉल करने की अनुमति" मांगेगा — Allow करें।'
                  : 'The first time, Android asks to allow installs from NeuralFeed — tap Allow.'}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </UpdateContext.Provider>
  )
}

export function useUpdates() {
  const ctx = useContext(UpdateContext)
  if (!ctx) throw new Error('useUpdates must be used inside <UpdateProvider>')
  return ctx
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  sheet: { width: '100%', maxWidth: 420, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: space.xl, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  notes: { maxHeight: 180, width: '100%', borderRadius: radius.md, marginTop: space.lg },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 5 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl, width: '100%' },
  btn: { flex: 1, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  primary: {},
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
