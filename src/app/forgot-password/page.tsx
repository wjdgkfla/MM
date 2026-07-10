'use client'
import Link from 'next/link'
import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: sbError } = await getSupabaseClient().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (sbError) throw sbError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-[var(--r-lg)] border bg-white p-8 text-center" style={{ borderColor: 'var(--m-line)' }}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--m-green-soft)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--m-green)]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--m-ink)' }}>Check your email</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>
            If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox.
          </p>
          <Link href="/sign-in" className="mt-6 inline-block text-sm font-medium" style={{ color: 'var(--m-green)' }}>Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
        <h1 className="font-display text-display-md font-black" style={{ color: 'var(--m-ink)' }}>Forgot password?</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>Enter your GMU email and we&apos;ll send a reset link.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>GMU email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmu.edu" className="ui-input" />
          </div>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="mt-4 text-sm" style={{ color: 'var(--m-muted)' }}>
          Remember it? <Link href="/sign-in" className="font-medium" style={{ color: 'var(--m-green)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
