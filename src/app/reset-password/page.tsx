'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — the client SDK handles it automatically
    const supabase = getSupabaseClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSubmitting(true)
    try {
      const supabase = getSupabaseClient()
      const { error: sbError } = await supabase.auth.updateUser({ password })
      if (sbError) throw sbError
      // Sign out all sessions globally — invalidates any attacker sessions too
      await supabase.auth.signOut({ scope: 'global' })
      // Clear our own session cookie via the sign-out API
      await fetch('/api/auth/sign-out', { method: 'POST' })
      window.location.href = '/sign-in?reset=success'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-sm" style={{ color: 'var(--m-muted)' }}>Verifying reset link…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-auth rounded-[var(--r-lg)] border bg-white p-8" style={{ borderColor: 'var(--m-line)' }}>
        <h1 className="font-display text-display-md font-black" style={{ color: 'var(--m-ink)' }}>New password</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>New password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="ui-input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Confirm password</label>
            <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className="ui-input" />
          </div>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
