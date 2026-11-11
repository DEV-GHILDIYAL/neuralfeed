// In-app updates for the sideloaded Android APK, using GitHub Releases as the update server.
//   1. check  → GET api.github.com/repos/<repo>/releases/latest, compare tag (v1.2.3) with the installed version
//   2. download the .apk asset into the app cache (with progress)
//   3. install → open Android's package installer on that file (user confirms; Android asks once to
//      "allow installs from NeuralFeed"). Every APK must be signed with the same key — see .github/workflows/android-release.yml
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Application from 'expo-application'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { Platform } from 'react-native'

export const GITHUB_REPO = 'DEV-GHILDIYAL/neuralfeed'
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`

export type UpdateInfo = {
  version: string
  notes: string
  apkUrl: string
  sizeBytes: number
  publishedAt: string
  pageUrl: string
}

const LAST_CHECK_KEY = 'neuralfeed:update:lastCheck'
const CHECK_EVERY_MS = 6 * 3600_000

/** Updates only make sense in a real Android build (not Expo Go, web or iOS). */
export const updatesSupported =
  Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient' && !__DEV__

export function currentVersion() {
  return Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0'
}

/** -1 if a < b, 0 if equal, 1 if a > b (numeric semver, ignores "v" prefix and pre-release tags). */
export function compareVersions(a: string, b: string) {
  const pa = a.replace(/^v/i, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/i, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0) ? 1 : -1
  }
  return 0
}

/** Returns update info if GitHub has a newer release with an APK, else null. Throttled unless `force`. */
export async function checkForUpdate({ force = false } = {}): Promise<UpdateInfo | null> {
  if (!force) {
    const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => 0)) || 0
    if (Date.now() - last < CHECK_EVERY_MS) return null
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(() => {})
  if (res.status === 404) return null // no releases yet
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`)
  const rel = await res.json()
  const version = String(rel.tag_name || '').replace(/^v/i, '')
  const apk = (rel.assets || []).find((a: { name: string }) => a.name.toLowerCase().endsWith('.apk'))
  if (!version || !apk || compareVersions(version, currentVersion()) <= 0) return null
  return {
    version,
    notes: String(rel.body || '').trim(),
    apkUrl: apk.browser_download_url,
    sizeBytes: apk.size || 0,
    publishedAt: rel.published_at,
    pageUrl: rel.html_url,
  }
}

/** Downloads the APK into the cache directory. `onProgress` gets 0..1. Returns the local file URI. */
export async function downloadUpdate(info: UpdateInfo, onProgress: (p: number) => void) {
  const dir = FileSystem.cacheDirectory + 'updates/'
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})
  const target = `${dir}NeuralFeed-${info.version}.apk`

  const existing = await FileSystem.getInfoAsync(target)
  if (existing.exists && info.sizeBytes && existing.size === info.sizeBytes) {
    onProgress(1)
    return target // already downloaded earlier
  }

  const task = FileSystem.createDownloadResumable(info.apkUrl, target, {}, (p) => {
    const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : info.sizeBytes
    if (total > 0) onProgress(Math.min(1, p.totalBytesWritten / total))
  })
  const result = await task.downloadAsync()
  if (!result || result.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true })
    throw new Error(`Download failed (HTTP ${result?.status ?? '?'})`)
  }
  onProgress(1)
  return result.uri
}

/** Opens Android's installer for the downloaded APK. */
export async function installUpdate(fileUri: string) {
  const contentUri = await FileSystem.getContentUriAsync(fileUri)
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  })
}

/** Removes old downloaded APKs (call after a successful update). */
export async function cleanUpdateCache() {
  await FileSystem.deleteAsync(FileSystem.cacheDirectory + 'updates/', { idempotent: true }).catch(() => {})
}
