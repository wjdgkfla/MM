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
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="ui-surface p-6">
        <h1 className="text-2xl font-bold text-[#006633]">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">Use your GMU email to access posting, messaging, and saving.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GMU email</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
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
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-700">Dev quick-fill</p>
            <p className="mt-1">Click to fill the email field (you still need the Firebase Auth password):</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEV_ADMIN_EMAILS.map((adminEmail) => (
                <button
                  key={adminEmail}
                  type="button"
                  onClick={() => handleDemoAdminClick(adminEmail)}
                  className="rounded-full border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-700"
                >
                  {adminEmail}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-sm text-gray-600">
          New here?{' '}
          <Link href={`/sign-up?redirect=${encodeURIComponent(redirect)}`} className="font-medium text-[#006633]">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
