'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthSession } from '@/lib/auth/types'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    // Re-fetch on every pathname change. This is safe because /api/auth/session
    // is fully exempt from rate limiting (see middleware.ts) and is a fast
    // cookie-only read with no database calls.
    //
    // Fetching on [pathname] ensures the session is always current after:
    //   - Sign-in via window.location.href (new page = new pathname)
    //   - Any navigation where session state might have changed
    //
    // The previous one-time-fetch approach caused a race: if the very first
    // mount happened before the Set-Cookie was committed, the user was stuck
    // as "not signed in" forever until a manual refresh.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    setLoading(true)
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
        // AbortError means the component unmounted or navigated away — not a sign-out
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
  }, [pathname])

  return { session, loading, isLoggedIn: Boolean(session) }
}
