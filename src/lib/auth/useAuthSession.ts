'use client'

import { useEffect, useRef, useState } from 'react'
import { AuthSession } from '@/lib/auth/types'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Only fetch once on mount. Session changes only happen via sign-in/out,
    // both of which do a full page reload (window.location.href) — no need
    // to re-fetch on every navigation. Re-fetching on [pathname] was causing
    // the rate limiter to fire and sign users out.
    if (fetchedRef.current) return
    fetchedRef.current = true

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

    fetch('/api/auth/session', {
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Session check failed: ${res.status}`)
        return res.json()
      })
      .then((payload) => setSession(payload?.session || null))
      .catch((err) => {
        // AbortError from timeout or unmount — not a real sign-out
        if (err.name !== 'AbortError') setSession(null)
      })
      .finally(() => {
        clearTimeout(timeoutId)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, []) // Run once on mount only

  return { session, loading, isLoggedIn: Boolean(session) }
}
