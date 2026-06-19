'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Category, Condition, CampusLocation, PickupZone, ListingKind } from '@/lib/types'
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS, PICKUP_ZONE_LABELS } from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { applyPhotoAction } from '@/lib/photoCollection'

type SellFormState = {
  title: string
  price: string
  category: Category
  condition: Condition
  description: string
  campusLocation: CampusLocation
  pickupZone: PickupZone
  pickupNotes: string
  courseCode: string
  professorName: string
  edition: string
  bundleNotes: string
  tags: string
  listingKind: ListingKind
}

const DRAFT_KEY = 'mm_sell_draft'

function filesToDataUrls(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })
    )
  )
}

async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.error || 'Image upload failed')
  }
  const data = await res.json()
  return Array.isArray(data?.urls) ? data.urls : []
}

export default function SellPage() {
  const router = useRouter()
  const { t, locale } = useLocale()
  const { session, loading: authLoading } = useAuthSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [form, setForm] = useState<SellFormState>({
    title: '',
    price: '',
    category: 'textbooks',
    condition: 'good',
    description: '',
    campusLocation: 'fairfax',
    pickupZone: 'jc-lobby',
    pickupNotes: '',
    courseCode: '',
    professorName: '',
    edition: '',
    bundleNotes: '',
    tags: '',
    listingKind: 'sell',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const kind = params.get('kind')
    const q = params.get('q')
    if (kind === 'wanted' || kind === 'sell') {
      setForm(prev => ({ ...prev, listingKind: kind as ListingKind }))
    }
    if (q) {
      setForm(prev => ({ ...prev, title: q }))
    }
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.title === 'string' && parsed.title || typeof parsed?.description === 'string' && parsed.description) {
          setShowDraftBanner(true)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    }, 500)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [form])

  const parsedTags = useMemo(
    () =>
      form.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
        .filter(Boolean)
        .slice(0, 5),
    [form.tags]
  )

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (newFiles.length === 0) return

    const combined = [...imageFiles, ...newFiles].slice(0, 4)
    try {
      const urls = await filesToDataUrls(combined)
      setImagePreviews(urls)
      setImageFiles(combined)
    } catch {
      setError('Could not load selected images. Please try different files.')
    }
  }

  const movePhoto = (from: number, to: number) => {
    setImagePreviews((current) => applyPhotoAction(current, { type: 'move', from, to }))
    setImageFiles((current) => applyPhotoAction(current, { type: 'move', from, to }))
    setCoverIndex((current) => current === from ? to : current)
  }

  const removePhoto = (index: number) => {
    setImagePreviews((current) => applyPhotoAction(current, { type: 'remove', index }))
    setImageFiles((current) => applyPhotoAction(current, { type: 'remove', index }))
    setCoverIndex((current) => Math.max(0, Math.min(current > index ? current - 1 : current, imagePreviews.length - 2)))
  }

  const validate = () => {
    if (form.listingKind === 'sell' && imageFiles.length === 0)
      return 'At least 1 photo is required for selling listings.'
    if (form.title.trim().length < 5) return 'Title should be at least 5 characters.'
    if (form.description.trim().length < 15) return 'Description should be at least 15 characters.'
    if (form.pickupNotes.trim().length < 6) return 'Pickup notes should be at least 6 characters.'
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) return 'Price must be 0 or higher.'
    if (form.category === 'textbooks' && form.courseCode.trim().length > 0 && form.courseCode.trim().length < 3) {
      return 'Course code should be at least 3 characters when provided.'
    }
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)

    try {
      let finalImageUrls: string[] = []
      if (imageFiles.length > 0) {
        try {
          finalImageUrls = await uploadImages(imageFiles)
        } catch (uploadErr) {
          // Stop submission and tell the user — don't silently post without photos.
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Image upload failed'
          setError(`${msg}. Please remove the images or try again before posting.`)
          setSubmitting(false)
          return
        }
      }

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          tags: parsedTags,
          imageUrls: finalImageUrls,
          coverImageUrl: finalImageUrls[coverIndex] || finalImageUrls[0],
          listingKind: form.listingKind,
          courseCode: form.courseCode.trim(),
          professorName: form.professorName.trim(),
          edition: form.edition.trim(),
          bundleNotes: form.bundleNotes.trim(),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to create listing')
      }

      const listing = await res.json()
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/my-listings/${listing.id}/edit?posted=1`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create listing. If your session looks wrong, sign out and back in before retrying.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return <div className="max-w-2xl mx-auto px-4 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AuthRequiredCard
          title="Sign in to post listings"
          description="Posting is restricted to signed-in GMU users."
          redirectTo="/sell"
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="max-w-[640px]">
          <h1 className="font-display text-[44px] font-black leading-[0.98] mt-2" style={{ color: 'var(--m-ink)' }}>
            {locale === 'en' ? <>Post something<br />worth keeping.</> : t('sell.title')}
          </h1>
          <p className="text-[14px] mt-2 max-w-[420px]" style={{ color: 'var(--m-muted)' }}>
            {t('sell.subtitle')}
          </p>

          <div className="mt-6 mb-6 rounded-xl border bg-[var(--m-soft)] px-4 py-3 text-sm" style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}>
            Signed in as <span className="font-medium">{session.displayName}</span> ({session.email}) with the{' '}
            <span className="font-medium">{session.role}</span> role.
          </div>

          {showDraftBanner && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <span style={{ color: 'var(--m-ink)' }}>You have an unsaved draft. Restore it?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="font-semibold text-amber-700 hover:underline"
                  onClick={() => {
                    try {
                      const saved = localStorage.getItem(DRAFT_KEY)
                      if (saved) setForm(prev => ({ ...prev, ...JSON.parse(saved) }))
                    } catch {}
                    setShowDraftBanner(false)
                  }}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="font-semibold text-[var(--m-muted)] hover:underline"
                  onClick={() => {
                    localStorage.removeItem(DRAFT_KEY)
                    setShowDraftBanner(false)
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Listing type */}
            <section className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full font-mono-label text-[10px] font-bold text-white" style={{ background: 'var(--m-ink)' }}>
                  1
                </span>
                <p className="font-display text-[20px] font-black">What are you posting?</p>
              </div>
              <div className="flex rounded-xl border bg-[var(--m-soft)] p-1" style={{ borderColor: 'var(--m-line)' }}>
                {([
                  ['sell', 'Selling', 'I have something to sell'],
                  ['wanted', 'Wanted', "I'm looking for something"],
                ] as Array<[ListingKind, string, string]>).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, listingKind: value })}
                    className={`flex-1 rounded-lg px-4 py-3 text-left transition-colors ${form.listingKind === value ? 'bg-white shadow-sm' : ''}`}
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    <p className={`text-sm font-bold ${form.listingKind === value ? 'text-[var(--m-ink)]' : 'text-[var(--m-muted)]'}`}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--m-muted)' }}>{hint}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Section 2: Photos */}
            <section className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full font-mono-label text-[10px] font-bold text-white"
                  style={{ background: 'var(--m-ink)' }}
                >
                  2
                </span>
                <p className="font-display text-[20px] font-black">Photos</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>
                  Photos {form.listingKind === 'sell' ? <span className="text-red-500">*</span> : <span style={{ color: 'var(--m-muted)' }}>(optional for Wanted)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--m-pop)] file:px-3 file:py-2 file:text-white"
                  style={{ color: 'var(--m-muted)' }}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--m-muted)' }}>
                  {form.listingKind === 'sell' ? 'At least 1 photo required.' : 'Optional for Wanted posts.'} Up to 4 images (5MB each).
                </p>
                {imagePreviews.length > 0 ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {imagePreviews.map((src, index) => (
                      <div key={`${src}-${index}`} className="relative aspect-square w-full overflow-hidden rounded-lg border" style={{ borderColor: index === coverIndex ? 'var(--m-green)' : 'var(--m-line)' }}>
                        <Image src={src} alt={`Preview ${index + 1}`} fill className="object-cover" unoptimized />
                        <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1">
                          <button type="button" onClick={() => setCoverIndex(index)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--m-ink)]">
                            {index === coverIndex ? 'Cover' : 'Set'}
                          </button>
                          <button type="button" onClick={() => movePhoto(index, index - 1)} disabled={index === 0} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] disabled:opacity-40">&lt;</button>
                          <button type="button" onClick={() => movePhoto(index, index + 1)} disabled={index === imagePreviews.length - 1} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] disabled:opacity-40">&gt;</button>
                          <button type="button" onClick={() => removePhoto(index)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-red-700">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            {/* Section 3: Basics */}
            <section className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full font-mono-label text-[10px] font-bold text-white"
                  style={{ background: 'var(--m-ink)' }}
                >
                  3
                </span>
                <p className="font-display text-[20px] font-black">Basics</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. TI-84 calculator used in STAT 250"
                    className="ui-input"
                  />
                </div>

                <div className="rounded-xl bg-[var(--m-soft)] p-3 sm:p-4">
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--m-ink)' }}>Basic details</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Price ($) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="0"
                        className="ui-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Category *</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                        className="ui-input"
                      >
                        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Condition *</label>
                      <select
                        value={form.condition}
                        onChange={(e) => setForm({ ...form, condition: e.target.value as Condition })}
                        className="ui-input"
                      >
                        {(Object.keys(CONDITION_LABELS) as Condition[]).map((cond) => (
                          <option key={cond} value={cond}>
                            {CONDITION_LABELS[cond]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Description *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Condition details, what is included, and best pickup time."
                    className="ui-input resize-none"
                  />
                </div>

                {form.category === 'textbooks' ? (
                  <div className="rounded-xl bg-[var(--m-soft)] p-3 sm:p-4">
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--m-ink)' }}>Course material details (optional)</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Course code</label>
                        <input
                          type="text"
                          value={form.courseCode}
                          onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                          placeholder="e.g. CS 112"
                          className="ui-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Professor</label>
                        <input
                          type="text"
                          value={form.professorName}
                          onChange={(e) => setForm({ ...form, professorName: e.target.value })}
                          placeholder="e.g. Prof. Kim"
                          className="ui-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Edition</label>
                        <input
                          type="text"
                          value={form.edition}
                          onChange={(e) => setForm({ ...form, edition: e.target.value })}
                          placeholder="e.g. 8th edition"
                          className="ui-input"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Bundle notes</label>
                        <input
                          type="text"
                          value={form.bundleNotes}
                          onChange={(e) => setForm({ ...form, bundleNotes: e.target.value })}
                          placeholder="e.g. Includes workbook + formula sheet"
                          className="ui-input"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Advanced / optional fields — collapsed by default */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(v => !v)}
                    className="flex items-center gap-1.5 text-[13px] font-medium"
                    style={{ color: 'var(--m-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
                    {showAdvanced ? 'Hide' : 'Show'} advanced options (tags)
                  </button>
                  {showAdvanced && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Tags (optional)</label>
                      <input
                        type="text"
                        value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="exam prep, move-out, pickup today"
                        className="ui-input"
                      />
                      <p className="mt-1 text-xs" style={{ color: 'var(--m-muted)' }}>Comma-separated. Up to 5 tags.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section 4: Pickup zone */}
            <section className="rounded-[var(--r-lg)] border bg-white p-6" style={{ borderColor: 'var(--m-line)' }}>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full font-mono-label text-[10px] font-bold text-white"
                  style={{ background: 'var(--m-ink)' }}
                >
                  4
                </span>
                <p className="font-display text-[20px] font-black">Pickup zone</p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--m-soft)] p-3 sm:p-4">
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--m-ink)' }}>Pickup setup</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Campus *</label>
                      <select
                        value={form.campusLocation}
                        onChange={(e) => setForm({ ...form, campusLocation: e.target.value as CampusLocation })}
                        className="ui-input"
                      >
                        {(Object.keys(LOCATION_LABELS) as CampusLocation[]).map((loc) => (
                          <option key={loc} value={loc}>
                            {LOCATION_LABELS[loc]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Pickup zone *</label>
                      <select
                        value={form.pickupZone}
                        onChange={(e) => setForm({ ...form, pickupZone: e.target.value as PickupZone })}
                        className="ui-input"
                      >
                        {(Object.keys(PICKUP_ZONE_LABELS) as PickupZone[]).map((zone) => (
                          <option key={zone} value={zone}>
                            {PICKUP_ZONE_LABELS[zone]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--m-ink)' }}>Pickup notes *</label>
                  <textarea
                    required
                    rows={3}
                    maxLength={300}
                    value={form.pickupNotes}
                    onChange={(e) => setForm({ ...form, pickupNotes: e.target.value })}
                    placeholder="e.g. Johnson Center lobby near the info desk, weekdays after 2pm"
                    className="ui-input resize-none"
                  />
                </div>
              </div>
            </section>

            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--m-pop)' }}
              >
                {submitting ? 'Posting…' : 'Post listing →'}
              </button>
              <a href="/my-listings" className="ui-btn-secondary">
                Cancel
              </a>
            </div>
          </form>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-[88px]">
            <p className="font-mono-label text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--m-muted)' }}>
              Live preview
            </p>
            <div className="rounded-[var(--r-lg)] border bg-white p-4" style={{ borderColor: 'var(--m-line)' }}>
              <div className="aspect-square rounded-xl bg-[var(--m-soft)]" />
              <p className="font-display font-black text-[26px] mt-3 tabular-nums" style={{ color: form.price ? 'var(--m-ink)' : 'var(--m-muted)' }}>
                {form.price ? (form.price === '0' ? 'Free' : `$${form.price}`) : '—'}
              </p>
              <p className="text-[13px] font-semibold mt-1 line-clamp-2 min-h-[2.4em]" style={{ color: form.title ? 'var(--m-ink)' : 'var(--m-muted)' }}>
                {form.title || 'Your title shows here'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
