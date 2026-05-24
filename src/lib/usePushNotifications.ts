'use client'
import { useEffect, useRef } from 'react'

export function usePushNotifications(userId: string | undefined) {
  const subscribed = useRef(false)

  useEffect(() => {
    if (!userId || subscribed.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey || publicKey.startsWith('placeholder')) return

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const existing = await reg.pushManager.getSubscription()
        if (existing) { subscribed.current = true; return }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey.trim()).buffer as ArrayBuffer,
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        subscribed.current = true
      } catch (err) {
        console.error('Push setup error:', err)
      }
    }

    setup()
  }, [userId])
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
