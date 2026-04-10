'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthSession } from '@/lib/auth/types'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    fetch('/api/auth/session', {
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((payload) => setSession(payload?.session || null))
      .catch((err) => {
        // Ignore cancellations from rapid navigation — not a real error
        if (err.name !== 'AbortError') setSession(null)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [pathname])

  return { session, loading, isLoggedIn: Boolean(session) }
}
