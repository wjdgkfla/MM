'use client'

import { useEffect, useState } from 'react'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { User } from '@/lib/types'
import { getPushSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/pushSubscription'

export default function SettingsPage() {
  const { session, loading } = useAuthSession()
  const [user, setUser] = useState<User | null>(null)
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch('/api/profile')
      .then((res) => res.json())
      .then((payload) => {
        setUser(payload.user)
        setMarketingEmailOptIn(Boolean(payload.user?.marketingEmailOptIn))
      })
      .catch(() => setMessage('Could not load settings.'))
      .finally(() => setDataLoading(false))
  }, [session])

  useEffect(() => {
    if (!session || !isPushSupported()) return
    setPushSupported(true)
    getPushSubscription().then((sub) => setPushSubscribed(Boolean(sub)))
  }, [session])

  const togglePush = async () => {
    setPushBusy(true)
    try {
      const ok = pushSubscribed ? await unsubscribeFromPush() : await subscribeToPush()
      if (ok) setPushSubscribed(!pushSubscribed)
    } finally {
      setPushBusy(false)
    }
  }

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

  const skeleton = (
    <div className="mx-auto max-w-narrow px-6 py-8">
      <div className="h-9 w-40 rounded-lg bg-[var(--m-soft)] animate-pulse" />
      <div className="mt-2 h-4 w-64 rounded bg-[var(--m-soft)] animate-pulse" />
      <div className="ui-surface mt-6 space-y-4 p-5">
        <div className="h-5 w-full rounded bg-[var(--m-soft)] animate-pulse" />
        <div className="h-5 w-3/4 rounded bg-[var(--m-soft)] animate-pulse" />
      </div>
    </div>
  )

  if (loading) return skeleton
  if (!session) {
    return (
      <div className="mx-auto max-w-narrow px-6 py-8">
        <AuthRequiredCard title="Sign in to manage settings" description="Settings are available for signed-in GMU users." redirectTo="/settings" />
      </div>
    )
  }
  if (dataLoading) return skeleton

  return (
    <div className="mx-auto max-w-narrow px-6 py-8">
      <h1 className="font-display text-display-lg font-black text-[var(--m-ink)]">Settings</h1>
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

        {pushSupported ? (
          <div className="flex items-start justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--m-line)' }}>
            <span>
              <span className="block font-semibold text-[var(--m-ink)]">Push notifications</span>
              <span className="block text-sm text-[var(--m-muted)]">
                {pushSubscribed ? 'On — you\'ll get alerts for new messages and offers.' : 'Off — turn on to get alerts for new messages and offers.'}
              </span>
            </span>
            <button
              type="button"
              onClick={togglePush}
              disabled={pushBusy}
              className="ui-btn-secondary shrink-0"
            >
              {pushBusy ? '...' : pushSubscribed ? 'Turn off' : 'Turn on'}
            </button>
          </div>
        ) : null}

        <div className="rounded-xl bg-[var(--m-soft)] p-3 text-sm text-[var(--m-muted)]">
          Theme settings will live here later. For now, Mason Market stays in the current light design.
        </div>
        {message ? <p className="text-sm text-[var(--m-ink)]">{message}</p> : null}
        <button type="button" onClick={save} disabled={saving} className="ui-btn-primary">{saving ? 'Saving...' : 'Save settings'}</button>
      </section>
    </div>
  )
}
