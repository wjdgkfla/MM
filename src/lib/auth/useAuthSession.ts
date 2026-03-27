'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthSession } from '@/lib/auth/types'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    setLoading(true)
    fetch('/api/auth/session', {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((payload) => setSession(payload?.session || null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [pathname])

  return { session, loading, isLoggedIn: Boolean(session) }
}
