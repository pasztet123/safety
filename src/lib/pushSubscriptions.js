import { supabase } from './supabase'

const PUSH_CONFIG_FUNCTION = 'attendance-risk-push-config'

const hasWindow = () => typeof window !== 'undefined'
const SERVICE_WORKER_READY_TIMEOUT_MS = 4000

const waitFor = (promise, timeoutMs, timeoutMessage) => new Promise((resolve, reject) => {
  const timeoutId = window.setTimeout(() => {
    reject(new Error(timeoutMessage))
  }, timeoutMs)

  promise
    .then((value) => {
      window.clearTimeout(timeoutId)
      resolve(value)
    })
    .catch((error) => {
      window.clearTimeout(timeoutId)
      reject(error)
    })
})

export const getPushSupportDiagnostics = () => {
  const secureContext = hasWindow() ? Boolean(window.isSecureContext) : false
  const serviceWorkerSupported = hasWindow() && 'serviceWorker' in navigator
  const pushManagerSupported = hasWindow() && 'PushManager' in window
  const notificationsSupported = hasWindow() && 'Notification' in window
  const displayModeStandalone = hasWindow() && typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false
  const navigatorStandalone = hasWindow() && typeof window.navigator.standalone === 'boolean'
    ? Boolean(window.navigator.standalone)
    : false
  const standalone = displayModeStandalone || navigatorStandalone
  const protocol = hasWindow() ? String(window.location.protocol || '') : ''
  const hostname = hasWindow() ? String(window.location.hostname || '') : ''
  const userAgent = hasWindow() ? String(window.navigator.userAgent || '') : ''
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)

  const reasons = []
  if (!secureContext) reasons.push('secure-context-required')
  if (!serviceWorkerSupported) reasons.push('service-worker-missing')
  if (!pushManagerSupported) reasons.push('push-manager-missing')
  if (!notificationsSupported) reasons.push('notifications-api-missing')
  if (isAppleMobile && !standalone) reasons.push('ios-home-screen-required')

  return {
    supported: secureContext && serviceWorkerSupported && pushManagerSupported && notificationsSupported,
    secureContext,
    serviceWorkerSupported,
    pushManagerSupported,
    notificationsSupported,
    standalone,
    protocol,
    hostname,
    isAppleMobile,
    reasons,
  }
}

export const isPushSupported = () => (
  getPushSupportDiagnostics().supported
)

const getNotificationPermission = () => {
  if (!hasWindow() || typeof Notification === 'undefined') return 'default'
  return Notification.permission
}

const base64UrlToUint8Array = (value) => {
  const base64 = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(value || '').length / 4) * 4, '=')

  const raw = window.atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

const getRegistration = async () => {
  if (!isPushSupported()) return null

  const existingRegistration = await navigator.serviceWorker.getRegistration()
  if (existingRegistration) return existingRegistration

  try {
    const readyRegistration = await waitFor(
      navigator.serviceWorker.ready,
      SERVICE_WORKER_READY_TIMEOUT_MS,
      'Timed out waiting for the service worker to become ready.',
    )
    if (readyRegistration) return readyRegistration
  } catch {
    // Fall through to the final registration check so the caller gets a clearer message.
  }

  return navigator.serviceWorker.getRegistration()
}

const getDeviceNameHint = () => {
  const language = hasWindow() ? window.navigator.language : 'en-US'
  const platform = hasWindow() ? window.navigator.platform || 'unknown-platform' : 'unknown-platform'
  return `${platform} · ${language}`.slice(0, 120)
}

const getPublicPushConfig = async () => {
  const { data, error } = await supabase.functions.invoke(PUSH_CONFIG_FUNCTION, {
    body: {},
  })

  if (error) {
    throw new Error(error.message || 'Unable to load push configuration.')
  }

  return {
    vapidPublicKey: String(data?.vapidPublicKey || '').trim(),
  }
}

const upsertSubscriptionRow = async ({ subscription, userId }) => {
  const json = subscription?.toJSON?.() || {}
  const endpoint = String(json.endpoint || '').trim()
  const p256dh = String(json.keys?.p256dh || '').trim()
  const auth = String(json.keys?.auth || '').trim()

  if (!endpoint || !p256dh || !auth) {
    throw new Error('The browser returned an incomplete push subscription.')
  }

  const payload = {
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    device_name_hint: getDeviceNameHint(),
    user_agent: hasWindow() ? String(window.navigator.userAgent || '').slice(0, 512) : null,
    last_seen_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('user_push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' })

  if (error) throw error

  return payload
}

export const getPushSubscriptionState = async () => {
  const diagnostics = getPushSupportDiagnostics()
  const supported = diagnostics.supported
  if (!supported) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      endpoint: null,
      diagnostics,
    }
  }

  const registration = await getRegistration()
  const subscription = await registration?.pushManager.getSubscription()

  return {
    supported: true,
    permission: getNotificationPermission(),
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint || null,
    diagnostics,
  }
}

export const syncCurrentPushSubscription = async ({ userId }) => {
  if (!userId || !isPushSupported()) return null

  const registration = await getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return null

  return upsertSubscriptionRow({ subscription, userId })
}

export const subscribeCurrentUserToAttendanceRiskPush = async ({ userId }) => {
  if (!userId) {
    throw new Error('You must be signed in to enable device reminders.')
  }

  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      endpoint: null,
      diagnostics: getPushSupportDiagnostics(),
    }
  }

  const registration = await getRegistration()
  if (!registration) {
    throw new Error('Push setup is unavailable because the service worker is not registered for this app yet.')
  }

  let permission = getNotificationPermission()
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission !== 'granted') {
    return {
      supported: true,
      permission,
      subscribed: false,
      endpoint: null,
    }
  }

  const { vapidPublicKey } = await getPublicPushConfig()
  if (!vapidPublicKey) {
    throw new Error('Push is not configured on the backend yet.')
  }

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    })
  }

  await upsertSubscriptionRow({ subscription, userId })

  return {
    supported: true,
    permission,
    subscribed: true,
    endpoint: subscription.endpoint,
    diagnostics: getPushSupportDiagnostics(),
  }
}

export const unsubscribeCurrentUserFromAttendanceRiskPush = async () => {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      endpoint: null,
      diagnostics: getPushSupportDiagnostics(),
    }
  }

  const registration = await getRegistration()
  const subscription = await registration?.pushManager.getSubscription()

  if (subscription?.endpoint) {
    const { error } = await supabase
      .from('user_push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)

    if (error) throw error
  }

  if (subscription) {
    await subscription.unsubscribe()
  }

  return {
    supported: true,
    permission: getNotificationPermission(),
    subscribed: false,
    endpoint: null,
    diagnostics: getPushSupportDiagnostics(),
  }
}