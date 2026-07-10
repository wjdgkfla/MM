'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { CAMPUS_LOCATIONS, LOCATION_LABELS, User } from '@/lib/types'

async function uploadProfileImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('files', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.error || 'Image upload failed')
  }
  const data = await res.json()
  return data.urls?.[0] || ''
}

export default function ProfilePage() {
  const { session, loading } = useAuthSession()
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [homeCampus, setHomeCampus] = useState<User['homeCampus']>('fairfax')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch('/api/profile')
      .then((res) => res.json())
      .then((payload) => {
        const nextUser = payload.user as User
        setUser(nextUser)
        setDisplayName(nextUser.displayName)
        setBio(nextUser.bio || '')
        setHomeCampus(nextUser.homeCampus)
        setProfileImageUrl(nextUser.profileImageUrl || '')
      })
      .catch(() => setMessage('Could not load profile.'))
      .finally(() => setDataLoading(false))
  }, [session])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, homeCampus, profileImageUrl }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Could not save profile')
      setUser(payload.user)
      setMessage('Profile updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  const onImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMessage('Uploading profile photo...')
    try {
      setProfileImageUrl(await uploadProfileImage(file))
      setMessage('Profile photo ready. Save your profile to keep it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload profile photo.')
    }
  }

  const skeleton = (
    <div className="mx-auto max-w-content px-6 py-8">
      <div className="h-9 w-32 rounded-lg bg-[var(--m-soft)] animate-pulse" />
      <div className="mt-2 h-4 w-72 rounded bg-[var(--m-soft)] animate-pulse" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="ui-surface p-5 text-center">
          <div className="mx-auto h-28 w-28 rounded-full bg-[var(--m-soft)] animate-pulse" />
        </div>
        <div className="ui-surface space-y-4 p-5">
          <div className="h-10 w-full rounded-xl bg-[var(--m-soft)] animate-pulse" />
          <div className="h-24 w-full rounded-xl bg-[var(--m-soft)] animate-pulse" />
          <div className="h-10 w-2/3 rounded-xl bg-[var(--m-soft)] animate-pulse" />
        </div>
      </div>
    </div>
  )

  if (loading) return skeleton
  if (!session) {
    return (
      <div className="mx-auto max-w-narrow px-6 py-8">
        <AuthRequiredCard title="Sign in to edit your profile" description="Profiles are available for signed-in GMU users." redirectTo="/profile" />
      </div>
    )
  }
  if (dataLoading) return skeleton

  return (
    <div className="mx-auto max-w-content px-6 py-8">
      <h1 className="font-display text-display-lg font-black text-[var(--m-ink)]">Profile</h1>
      <p className="mt-1 text-sm text-[var(--m-muted)]">Manage the public info other Mason Market users see.</p>

      <form onSubmit={saveProfile} className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <section className="ui-surface p-5 text-center">
          <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full bg-[var(--m-soft)]">
            {profileImageUrl ? (
              <Image src={profileImageUrl} alt={displayName || 'Profile photo'} fill className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-items-center text-3xl font-black text-[var(--m-muted)]">
                {(displayName || session.displayName || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} className="mt-4 block w-full text-xs text-[var(--m-muted)] file:rounded-lg file:border-0 file:bg-[var(--m-pop)] file:px-3 file:py-2 file:text-white" />
          <p className="mt-4 text-xs text-[var(--m-muted)]">{user?.gmuEmail}</p>
        </section>

        <section className="ui-surface space-y-4 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--m-ink)]">Display name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="ui-input" maxLength={100} required />
            <p className="mt-1 text-right text-xs" style={{ color: 'var(--m-muted)' }}>{displayName.length}/100</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--m-ink)]">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="ui-input resize-none" rows={4} maxLength={300} placeholder="Textbooks, dorm gear, electronics, or what you usually sell." />
            <p className="mt-1 text-right text-xs" style={{ color: 'var(--m-muted)' }}>{bio.length}/300</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--m-ink)]">Home campus</label>
            <select value={homeCampus} onChange={(e) => setHomeCampus(e.target.value as User['homeCampus'])} className="ui-input">
              {CAMPUS_LOCATIONS.map((campus) => <option key={campus} value={campus}>{LOCATION_LABELS[campus]}</option>)}
            </select>
          </div>
          {message ? <p className="rounded-lg bg-[var(--m-soft)] px-3 py-2 text-sm text-[var(--m-ink)]">{message}</p> : null}
          <button type="submit" disabled={saving} className="ui-btn-primary">{saving ? 'Saving...' : 'Save profile'}</button>
        </section>
      </form>
    </div>
  )
}
