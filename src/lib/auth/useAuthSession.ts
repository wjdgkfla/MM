'use client'

import { useEffect, useState } from 'react'
import { AuthSession } from '@/lib/auth/types'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((payload) => setSession(payload?.session || null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  return { session, loading, isLoggedIn: Boolean(session) }
}
