'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/auth/authErrors'
import { sanitizeRedirectPath } from '@/lib/validators'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export default function SignUpPage() {
  const { t } = useLocale()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false)
  const [redirect, setRedirect] = useState('/')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirect(sanitizeRedirectPath(params.get('redirect')))
  }, [])

  const trimmedEmail = email.trim().toLowerCase()

  const finishSignUp = async (accessToken: string) => {
    const res = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        accessToken,
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
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

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

      if (signUpError || !data.user) {
        throw signUpError || new Error('Sign-up failed. Please try again.')
      }

      // Supabase returns a "fake" success with an empty identities array instead
      // of an error when the email is already registered and confirmed — this is
      // intentional anti-enumeration behavior, not a real new signup. Catch it
      // here so the user gets a clear message instead of a false "check your
      // inbox" state that will never receive a code.
      if (data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account already exists for this email. Try signing in instead.')
      }

      // With "Confirm email" enabled in Supabase (the production setting), signUp
      // succeeds but returns no session until the 6-digit code is verified.
      if (!data.session) {
        setPendingConfirmation(true)
        return
      }

      await finishSignUp(data.session.access_token)
    } catch (submitError) {
      setError(friendlyAuthError(submitError, 'sign-up'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setVerifying(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otp.trim(),
        type: 'signup',
      })

      if (verifyError || !data.session) {
        throw verifyError || new Error('Invalid or expired code. Please try again.')
      }

      await finishSignUp(data.session.access_token)
    } catch (verifyErr) {
      setError(friendlyAuthError(verifyErr, 'sign-up'))
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setResendMessage('')
    setResending(true)
    try {
      const supabase = getSupabaseClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
      })
      if (resendError) throw resendError
      setResendMessage('A new code is on its way to your inbox.')
    } catch (resendErr) {
      setError(friendlyAuthError(resendErr, 'sign-up'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
        <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>{t('signup.title')}</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>{t('signup.subtitle')}</p>

        {pendingConfirmation ? (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <p className="rounded-lg px-3 py-3 text-sm font-medium" style={{ background: 'var(--m-green-soft)', color: 'var(--m-green)' }}>
              {t('signup.otpSent')} <strong>{trimmedEmail}</strong>. {t('signup.otpInstructions')}
            </p>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>{t('signup.otpLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="123456"
                className="ui-input text-center text-[20px] tracking-[0.3em]"
              />
            </div>

            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            {resendMessage ? <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--m-soft)', color: 'var(--m-muted)' }}>{resendMessage}</p> : null}

            <button type="submit" disabled={verifying} className="ui-btn-primary w-full">
              {verifying ? t('signup.confirming') : t('signup.confirm')}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="block w-full text-center text-sm font-medium"
              style={{ color: 'var(--m-green)' }}
            >
              {resending ? t('signup.resending') : t('signup.resend')}
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>{t('signup.displayName')}</label>
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
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>{t('signup.email')}</label>
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
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>{t('signup.password')}</label>
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
            {t('signup.marketing')}
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? t('signup.submitting') : t('signup.submit')}
          </button>
        </form>
        )}

        <p className="mt-4 text-sm" style={{ color: 'var(--m-muted)' }}>
          {t('signup.haveAccess')}{' '}
          <Link href={`/sign-in?redirect=${encodeURIComponent(redirect)}`} className="font-medium" style={{ color: 'var(--m-green)' }}>
            {t('signup.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
