/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const navigationRoute = new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  denylist: [/^\/api/],
})

registerRoute(navigationRoute)

const DEFAULT_NOTIFICATION = {
  title: 'Attendance reminder',
  body: 'Open the dashboard to review today\'s attendance-risk reminder.',
  url: '/',
  tag: 'attendance-risk-broadcast',
}

self.addEventListener('push', (event) => {
  let payload = { ...DEFAULT_NOTIFICATION }

  try {
    const eventData = event.data?.json?.()
    if (eventData && typeof eventData === 'object') {
      payload = {
        ...payload,
        ...eventData,
      }
    }
  } catch {
    const text = event.data?.text?.()
    if (text) {
      payload = {
        ...payload,
        body: text,
      }
    }
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag || DEFAULT_NOTIFICATION.tag,
    badge: '/pwa-192x192.png',
    icon: '/pwa-192x192.png',
    data: {
      url: payload.url || DEFAULT_NOTIFICATION.url,
    },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of clientList) {
      if ('focus' in client) {
        await client.navigate(targetUrl)
        await client.focus()
        return
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl)
    }
  })())
})