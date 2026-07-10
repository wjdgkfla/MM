'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DEV_ADMIN_EMAILS } from '@/lib/auth/devAdmin'
import { getSupabaseClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/auth/authErrors'
import { sanitizeRedirectPath } from '@/lib/validators'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export default function SignInPage() {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [redirect, setRedirect] = useState('/')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirect(sanitizeRedirectPath(params.get('redirect')))
    if (params.get('reset') === 'success') setResetSuccess(true)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const supabase = getSupabaseClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError || !data.session) {
        throw signInError || new Error('Sign-in failed')
      }

      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Sign-in failed')
      }

      // Full page reload ensures the session cookie is sent with the very first
      // request to the destination — router.push() + router.refresh() has a race
      // condition where the App Router re-renders before the cookie is committed.
      window.location.href = redirect
    } catch (submitError) {
      setError(friendlyAuthError(submitError, 'sign-in'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-auth rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
        <h1 className="font-display text-display-md font-black" style={{ color: 'var(--m-ink)' }}>{t('signin.title')}</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>{t('signin.subtitle')}</p>

        {resetSuccess ? (
          <p className="mt-4 rounded-lg px-3 py-2 text-sm font-medium" style={{ background: 'var(--m-green-soft)', color: 'var(--m-green)' }}>
            Password reset successfully. Sign in with your new password.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>{t('signin.email')}</label>
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
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>{t('signin.password')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Enter your password"
              className="ui-input"
            />
            <p className="text-right text-xs mt-1">
              <Link href="/forgot-password" className="hover:underline" style={{ color: 'var(--m-green)' }}>Forgot password?</Link>
            </p>
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? t('signin.submitting') : t('signin.submit')}
          </button>
        </form>

        {process.env.NODE_ENV !== 'production' ? (
          <div className="mt-4 rounded-lg border px-3 py-3 text-xs" style={{ borderColor: 'var(--m-line)', background: 'var(--m-soft)', color: 'var(--m-muted)' }}>
            <p className="font-semibold" style={{ color: 'var(--m-ink)' }}>Dev quick-fill</p>
            <p className="mt-1">Click to fill the email field:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEV_ADMIN_EMAILS.map((adminEmail) => (
                <button
                  key={adminEmail}
                  type="button"
                  onClick={() => setEmail(adminEmail)}
                  className="rounded-full border px-2.5 py-1 font-medium bg-white"
                  style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
                >
                  {adminEmail}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-sm" style={{ color: 'var(--m-muted)' }}>
          {t('signin.noAccount')}{' '}
          <Link href={`/sign-up?redirect=${encodeURIComponent(redirect)}`} className="font-medium" style={{ color: 'var(--m-green)' }}>
            {t('signin.signUpLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
