'use client'
import { useEffect, useRef } from 'react'
import { hasOptedOutOfPush, subscribeToPush } from '@/lib/pushSubscription'

export function usePushNotifications(userId: string | undefined) {
  const subscribed = useRef(false)

  useEffect(() => {
    if (!userId || subscribed.current) return
    if (hasOptedOutOfPush()) return

    subscribeToPush()
      .then((ok) => { subscribed.current = ok })
      .catch((err) => console.error('Push setup error:', err))
  }, [userId])
}
