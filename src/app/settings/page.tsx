'use client'

import { useEffect, useState } from 'react'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { User } from '@/lib/types'

export default function SettingsPage() {
  const { session, loading } = useAuthSession()
  const [user, setUser] = useState<User | null>(null)
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!session) return
    fetch('/api/profile')
      .then((res) => res.json())
      .then((payload) => {
        setUser(payload.user)
        setMarketingEmailOptIn(Boolean(payload.user?.marketingEmailOptIn))
      })
      .catch(() => setMessage('Could not load settings.'))
  }, [session])

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingEmailOptIn }),
      })
      if (!res.ok) throw new Error('Could not save settings')
      setMessage('Settings saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-[var(--m-muted)]">Loading...</div>
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <AuthRequiredCard title="Sign in to manage settings" description="Settings are available for signed-in GMU users." redirectTo="/settings" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-[36px] font-black text-[var(--m-ink)]">Settings</h1>
      <p className="mt-1 text-sm text-[var(--m-muted)]">Manage account preferences for {user?.gmuEmail || session.email}.</p>

      <section className="ui-surface mt-6 space-y-4 p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={marketingEmailOptIn}
            onChange={(e) => setMarketingEmailOptIn(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block font-semibold text-[var(--m-ink)]">Mason Market update emails</span>
            <span className="block text-sm text-[var(--m-muted)]">Get occasional updates about features, campus seasons, and saved marketplace activity.</span>
          </span>
        </label>
        <div className="rounded-xl bg-[var(--m-soft)] p-3 text-sm text-[var(--m-muted)]">
          Theme settings will live here later. For now, Mason Market stays in the current light design.
        </div>
        {message ? <p className="text-sm text-[var(--m-ink)]">{message}</p> : null}
        <button type="button" onClick={save} disabled={saving} className="ui-btn-primary">{saving ? 'Saving...' : 'Save settings'}</button>
      </section>
    </div>
  )
}
