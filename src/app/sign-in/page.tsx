'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
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
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Sign-in failed')
      }

      router.push(redirect)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sign-in failed')
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

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Demo admin account: <span className="font-medium">admin@gmu.edu</span>
        </div>

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
