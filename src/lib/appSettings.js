import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const DEFAULT_APP_TIMEZONE = 'America/Chicago'

const APP_SETTINGS_STORAGE_KEY = 'app-settings-cache-v1'
const APP_SETTINGS_EVENT = 'app-settings-updated'

const DEFAULT_APP_SETTINGS = {
  timezone: DEFAULT_APP_TIMEZONE,
  attendance_risk_notifications_enabled: false,
  attendance_risk_email_enabled: true,
  attendance_risk_in_app_enabled: true,
  attendance_risk_run_hour: 10,
}

const FALLBACK_TIMEZONE_OPTIONS = [
  'America/Chicago',
  'America/New_York',
  'America/Detroit',
  'America/Indiana/Indianapolis',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
  'Europe/London',
  'Europe/Warsaw',
]

let cachedAppSettings = null
let inFlightAppSettingsRequest = null

const hasWindow = () => typeof window !== 'undefined'

const cloneSettings = (settings) => ({
  ...DEFAULT_APP_SETTINGS,
  ...(settings || {}),
})

const readAppSettingsFromStorage = () => {
  if (!hasWindow()) return null

  try {
    const rawValue = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
    if (!rawValue) return null
    return cloneSettings(JSON.parse(rawValue))
  } catch {
    return null
  }
}

const writeAppSettingsToStorage = (settings) => {
  if (!hasWindow()) return

  try {
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(cloneSettings(settings)))
  } catch {
    // Ignore storage failures and continue with in-memory cache.
  }
}

const notifyAppSettingsUpdated = (settings) => {
  if (!hasWindow()) return

  window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT, {
    detail: cloneSettings(settings),
  }))
}

export const getTimeZoneOptions = () => {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      const supported = Intl.supportedValuesOf('timeZone')
      if (Array.isArray(supported) && supported.length > 0) {
        const preferred = FALLBACK_TIMEZONE_OPTIONS.filter((value) => supported.includes(value))
        const remaining = supported.filter((value) => !preferred.includes(value))
        return [...preferred, ...remaining]
      }
    } catch {
      // Ignore and fall back to the curated list.
    }
  }

  return [...FALLBACK_TIMEZONE_OPTIONS]
}

export const formatTimeZoneLabel = (timeZone) => {
  if (!timeZone) return DEFAULT_APP_TIMEZONE
  return timeZone.replace(/_/g, ' ')
}

export const getAppSettingsSync = () => {
  if (cachedAppSettings) return cloneSettings(cachedAppSettings)

  cachedAppSettings = readAppSettingsFromStorage() || cloneSettings(DEFAULT_APP_SETTINGS)
  return cloneSettings(cachedAppSettings)
}

export const getAppTimezoneSync = () => getAppSettingsSync().timezone || DEFAULT_APP_TIMEZONE

export const fetchAppSettings = async ({ force = false } = {}) => {
  if (!force && cachedAppSettings) return cloneSettings(cachedAppSettings)
  if (!force && inFlightAppSettingsRequest) return inFlightAppSettingsRequest

  const storageSettings = readAppSettingsFromStorage()
  if (!force && storageSettings) {
    cachedAppSettings = cloneSettings(storageSettings)
  }

  inFlightAppSettingsRequest = (async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('timezone, attendance_risk_notifications_enabled, attendance_risk_email_enabled, attendance_risk_in_app_enabled, attendance_risk_run_hour')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching app settings:', error)
      const fallbackSettings = cachedAppSettings || storageSettings || cloneSettings(DEFAULT_APP_SETTINGS)
      cachedAppSettings = cloneSettings(fallbackSettings)
      writeAppSettingsToStorage(cachedAppSettings)
      return cloneSettings(cachedAppSettings)
    }

    cachedAppSettings = cloneSettings(data || DEFAULT_APP_SETTINGS)
    writeAppSettingsToStorage(cachedAppSettings)
    return cloneSettings(cachedAppSettings)
  })()

  try {
    return await inFlightAppSettingsRequest
  } finally {
    inFlightAppSettingsRequest = null
  }
}

export const saveAppSettings = async (updates) => {
  const nextSettings = {
    ...await fetchAppSettings(),
    ...(updates || {}),
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      id: 1,
      timezone: nextSettings.timezone || DEFAULT_APP_TIMEZONE,
      attendance_risk_notifications_enabled: Boolean(nextSettings.attendance_risk_notifications_enabled),
      attendance_risk_email_enabled: Boolean(nextSettings.attendance_risk_email_enabled),
      attendance_risk_in_app_enabled: Boolean(nextSettings.attendance_risk_in_app_enabled),
      attendance_risk_run_hour: Number.isFinite(Number(nextSettings.attendance_risk_run_hour))
        ? Math.min(23, Math.max(0, Number(nextSettings.attendance_risk_run_hour)))
        : DEFAULT_APP_SETTINGS.attendance_risk_run_hour,
    })
    .select('timezone, attendance_risk_notifications_enabled, attendance_risk_email_enabled, attendance_risk_in_app_enabled, attendance_risk_run_hour')
    .single()

  if (error) throw error

  cachedAppSettings = cloneSettings(data || nextSettings)
  writeAppSettingsToStorage(cachedAppSettings)
  notifyAppSettingsUpdated(cachedAppSettings)

  return cloneSettings(cachedAppSettings)
}

export const subscribeToAppSettings = (listener) => {
  if (!hasWindow()) return () => {}

  const handler = (event) => {
    listener(cloneSettings(event.detail || DEFAULT_APP_SETTINGS))
  }

  window.addEventListener(APP_SETTINGS_EVENT, handler)
  return () => window.removeEventListener(APP_SETTINGS_EVENT, handler)
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState(() => getAppSettingsSync())

  useEffect(() => {
    let cancelled = false

    fetchAppSettings().then((resolvedSettings) => {
      if (!cancelled) setSettings(cloneSettings(resolvedSettings))
    })

    const unsubscribe = subscribeToAppSettings((nextSettings) => {
      if (!cancelled) setSettings(cloneSettings(nextSettings))
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return settings
}
