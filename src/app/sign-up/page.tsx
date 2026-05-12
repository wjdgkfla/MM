'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { getFirebaseClientAuth } from '@/lib/firebase/client'
import { friendlyAuthError } from '@/lib/auth/authErrors'

export default function SignUpPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [redirect, setRedirect] = useState('/')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirect(params.get('redirect') || '/')
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail.endsWith('@gmu.edu') && !trimmedEmail.endsWith('@masonlive.gmu.edu')) {
      setError('Only GMU email addresses are allowed (@gmu.edu or @masonlive.gmu.edu)')
      return
    }

    setSubmitting(true)

    try {
      const auth = getFirebaseClientAuth()
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() })
      }
      const idToken = await credential.user.getIdToken(true)

      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), idToken }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Sign-up failed')
      }

      router.push(redirect)
      router.refresh()
    } catch (submitError) {
      setError(friendlyAuthError(submitError, 'sign-up'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
        <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Create account</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>GMU-only access with Firebase email/password authentication.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Display name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="ui-input"
            />
          </div>

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
              placeholder="At least 6 characters"
              className="ui-input"
            />
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-sm" style={{ color: 'var(--m-muted)' }}>
          Already have access?{' '}
          <Link href={`/sign-in?redirect=${encodeURIComponent(redirect)}`} className="font-medium" style={{ color: 'var(--m-green)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
