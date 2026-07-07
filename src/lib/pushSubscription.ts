'use client'

// Browsers keep the Notification permission grant even after we unsubscribe,
// so a plain "is there a subscription?" check can't distinguish "never
// asked" from "user explicitly turned this off." Track the opt-out
// explicitly so the auto-subscribe hook doesn't silently re-subscribe
// someone right after they turned it off in Settings.
const OPT_OUT_KEY = 'mm_push_opt_out'

export function hasOptedOutOfPush(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(OPT_OUT_KEY) === '1'
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

/** Requests permission (if needed) and subscribes. Returns true on success. */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey || publicKey.startsWith('placeholder')) return false

  const reg = await navigator.serviceWorker.register('/sw.js')
  const existing = await reg.pushManager.getSubscription()
  if (existing) return true

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey.trim()).buffer as ArrayBuffer,
  })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
  if (res.ok) localStorage.removeItem(OPT_OUT_KEY)
  return res.ok
}

/** Unsubscribes locally and removes the server-side record. Returns true on success. */
export async function unsubscribeFromPush(): Promise<boolean> {
  localStorage.setItem(OPT_OUT_KEY, '1')
  const sub = await getPushSubscription()
  if (!sub) return true

  const res = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  await sub.unsubscribe()
  return res.ok
}
