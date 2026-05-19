'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/auth/authErrors'

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false)
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
      const supabase = getSupabaseClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      })

      if (signUpError || !data.session) {
        throw signUpError || new Error('Sign-up failed — check your email for a confirmation link if required.')
      }

      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          accessToken: data.session.access_token,
          marketingEmailOptIn,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Sign-up failed')
      }

      // Full page reload ensures the session cookie is sent with the very first
      // request to the destination — router.push() + router.refresh() has a race
      // condition where the App Router re-renders before the cookie is committed.
      window.location.href = redirect
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
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>GMU-only access. Sign up with your university email.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Display name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError('') }}
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
              onChange={(e) => { setEmail(e.target.value); setError('') }}
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
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="At least 6 characters"
              className="ui-input"
            />
          </div>

          <label className="flex items-start gap-2 rounded-xl bg-[var(--m-soft)] p-3 text-sm" style={{ color: 'var(--m-ink)' }}>
            <input
              type="checkbox"
              checked={marketingEmailOptIn}
              onChange={(e) => setMarketingEmailOptIn(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            Send me Mason Market updates about new features, campus seasons, and saved deals.
          </label>

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
