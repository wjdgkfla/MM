'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DEV_ADMIN_EMAILS } from '@/lib/auth/devAdmin'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { getFirebaseClientAuth } from '@/lib/firebase/client'
import { friendlyAuthError } from '@/lib/auth/authErrors'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [redirect, setRedirect] = useState('/')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDemoAdminClick = (adminEmail: string) => {
    setEmail(adminEmail)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirect(params.get('redirect') || '/')
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const auth = getFirebaseClientAuth()
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const idToken = await credential.user.getIdToken()

      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Sign-in failed')
      }

      router.push(redirect)
      router.refresh()
    } catch (submitError) {
      setError(friendlyAuthError(submitError, 'sign-in'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
        <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Sign in</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>Use your GMU email to access Mason Market.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>GMU email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmu.edu"
              className="ui-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="ui-input"
            />
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {process.env.NODE_ENV !== 'production' ? (
          <div className="mt-4 rounded-lg border px-3 py-3 text-xs" style={{ borderColor: 'var(--m-line)', background: 'var(--m-soft)', color: 'var(--m-muted)' }}>
            <p className="font-semibold" style={{ color: 'var(--m-ink)' }}>Dev quick-fill</p>
            <p className="mt-1">Click to fill the email field (you still need the Firebase Auth password):</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEV_ADMIN_EMAILS.map((adminEmail) => (
                <button
                  key={adminEmail}
                  type="button"
                  onClick={() => handleDemoAdminClick(adminEmail)}
                  className="rounded-full border px-2.5 py-1 font-medium bg-white" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
                >
                  {adminEmail}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-sm" style={{ color: 'var(--m-muted)' }}>
          New here?{' '}
          <Link href={`/sign-up?redirect=${encodeURIComponent(redirect)}`} className="font-medium" style={{ color: 'var(--m-green)' }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
