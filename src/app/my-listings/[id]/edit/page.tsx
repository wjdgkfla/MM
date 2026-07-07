'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LOCATION_LABELS,
  PICKUP_ZONE_LABELS,
  CampusLocation,
  Category,
  Condition,
  Listing,
  ListingKind,
  PickupZone,
} from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'
import { adjustIndexForPhotoAction, applyPhotoAction, filesToDataUrls, uploadImages } from '@/lib/photoCollection'
import { showToast } from '@/components/Toast'

type EditFormState = {
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

const EMPTY_FORM: EditFormState = {
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
}

export default function EditListingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { session, loading: authLoading } = useAuthSession()

  const [form, setForm] = useState<EditFormState>(EMPTY_FORM)
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<{ preview: string; file: File | null }[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const parsedTags = useMemo(
    () =>
      form.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
        .filter(Boolean)
        .slice(0, 5),
    [form.tags]
  )

  useEffect(() => {
    if (!params?.id || !session) return

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/listings/${params.id}`)
        if (!res.ok) throw new Error('Listing not found')
        const payload = await res.json()
        const listingData = payload.listing as Listing

        if (listingData.sellerId !== session.userId) {
          throw new Error('You can only edit your own listings')
        }

        setListing(listingData)
        setForm({
          title: listingData.title,
          price: String(listingData.price),
          category: listingData.category,
          condition: listingData.condition,
          description: listingData.description,
          campusLocation: listingData.campusLocation,
          pickupZone: listingData.pickupZone,
          pickupNotes: listingData.pickupNotes,
          courseCode: listingData.courseCode || '',
          professorName: listingData.professorName || '',
          edition: listingData.edition || '',
          bundleNotes: listingData.bundleNotes || '',
          tags: listingData.tags.join(', '),
          listingKind: listingData.listingKind || 'sell',
        })
        setImages((listingData.imageUrls || []).map((url) => ({ preview: url, file: null })))
        setCoverIndex(Math.max(0, (listingData.imageUrls || []).findIndex((url) => url === listingData.coverImageUrl)))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load listing')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params?.id, session])

  const validate = () => {
    if (form.listingKind === 'sell' && images.length === 0) return 'At least 1 photo is required.'
    if (form.title.trim().length < 5) return 'Title should be at least 5 characters.'
    if (form.description.trim().length < 15) return 'Description should be at least 15 characters.'
    if (form.pickupNotes.trim().length < 6) return 'Pickup notes should be at least 6 characters.'

    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0 || price > 50_000) return 'Price must be between $0 and $50,000.'

    if (form.category === 'textbooks' && form.courseCode.trim().length > 0 && form.courseCode.trim().length < 3) {
      return 'Course code should be at least 3 characters when provided.'
    }

    return ''
  }

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (newFiles.length === 0) return

    const filesToAdd = newFiles.slice(0, Math.max(0, 4 - images.length))
    if (filesToAdd.length === 0) return

    try {
      const urls = await filesToDataUrls(filesToAdd)
      setImages((current) => [...current, ...filesToAdd.map((file, i) => ({ preview: urls[i], file }))])
    } catch {
      setError('Could not load selected images. Please try different files.')
    }
  }

  const movePhoto = (from: number, to: number) => {
    const action = { type: 'move' as const, from, to }
    setImages((current) => applyPhotoAction(current, action))
    setCoverIndex((current) => adjustIndexForPhotoAction(current, action))
  }

  const removePhoto = (index: number) => {
    const action = { type: 'remove' as const, index }
    setImages((current) => applyPhotoAction(current, action))
    setCoverIndex((current) => Math.max(0, Math.min(adjustIndexForPhotoAction(current, action), images.length - 2)))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!listing) return

    setSubmitting(true)
    try {
      const newFiles = images.filter((img) => img.file).map((img) => img.file as File)
      let uploadedUrls: string[] = []
      if (newFiles.length > 0) {
        try {
          uploadedUrls = await uploadImages(newFiles)
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Image upload failed'
          setError(`${msg}. Please try again or remove the images before saving.`)
          setSubmitting(false)
          return
        }
      }
      let uploadIndex = 0
      const finalImageUrls = images.map((img) => (img.file ? uploadedUrls[uploadIndex++] : img.preview))

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          pickupNotes: form.pickupNotes.trim(),
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
        throw new Error(payload?.error || 'Failed to update listing')
      }

      showToast('Listing updated')
      router.push('/my-listings')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update listing')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!listing) return
    const ok = window.confirm('Delete this listing? It will be permanently removed from Mason Market.')
    if (!ok) return

    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to delete listing')
      }
      showToast('Listing deleted')
      router.push('/my-listings')
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete listing')
      setDeleting(false)
    }
  }

  if (authLoading) {
    return <div className="max-w-2xl mx-auto px-6 py-10 text-sm" style={{ color: 'var(--m-muted)' }}>Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <AuthRequiredCard
          title="Sign in to edit listings"
          description="Only signed-in GMU users can edit their own listings."
          redirectTo={`/my-listings/${params?.id || ''}/edit`}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="h-10 w-2/3 rounded bg-[var(--m-soft)] animate-pulse" />
        <div className="mt-4 h-80 rounded-2xl bg-[var(--m-soft)] animate-pulse" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <p style={{ color: 'var(--m-ink)' }}>Listing unavailable for editing.</p>
        <Link href="/my-listings" className="mt-3 inline-block text-sm font-medium" style={{ color: 'var(--m-green)' }}>
          Back to My Listings
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>Edit listing</h1>
        <Link href={`/item/${listing.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--m-muted)' }}>
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="ui-surface mt-5 space-y-5 p-4 sm:p-6">
        <div>
          <label className="block text-sm font-medium mb-2">Photos <span className="text-red-500">*</span></label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-[var(--m-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--m-pop)] file:px-3 file:py-2 file:text-white"
          />
          {images.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <div key={`${img.preview}-${index}`} className="relative aspect-square w-full overflow-hidden rounded-lg border" style={{ borderColor: index === coverIndex ? 'var(--m-green)' : 'var(--m-line)' }}>
                  <Image src={img.preview} alt={`Preview ${index + 1}`} fill className="object-cover" unoptimized />
                  <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1">
                    <button type="button" onClick={() => setCoverIndex(index)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--m-ink)]">
                      {index === coverIndex ? 'Cover' : 'Set'}
                    </button>
                    <button type="button" onClick={() => movePhoto(index, index - 1)} disabled={index === 0} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] disabled:opacity-40">&lt;</button>
                    <button type="button" onClick={() => movePhoto(index, index + 1)} disabled={index === images.length - 1} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] disabled:opacity-40">&gt;</button>
                    <button type="button" onClick={() => removePhoto(index)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-red-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            required
            maxLength={100}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="ui-input"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3 flex rounded-xl border bg-white p-1" style={{ borderColor: 'var(--m-line)' }}>
            {([
              ['sell', 'Selling'],
              ['wanted', 'Wanted'],
            ] as Array<[ListingKind, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, listingKind: value })}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${form.listingKind === value ? 'bg-[var(--m-ink)] text-white' : 'text-[var(--m-muted)]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price ($) *</label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="ui-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
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
            <label className="block text-sm font-medium mb-2">Condition *</label>
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

        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea
            required
            rows={5}
            maxLength={3000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="ui-input resize-none"
          />
        </div>

        {form.category === 'textbooks' ? (
          <div className="rounded-xl p-3 sm:p-4 bg-[var(--m-soft)]">
            <p className="text-sm font-medium mb-3">Course material details (optional)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Course code</label>
                <input
                  type="text"
                  value={form.courseCode}
                  onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                  placeholder="e.g. CS 112"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Professor</label>
                <input
                  type="text"
                  value={form.professorName}
                  onChange={(e) => setForm({ ...form, professorName: e.target.value })}
                  placeholder="e.g. Prof. Kim"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Edition</label>
                <input
                  type="text"
                  value={form.edition}
                  onChange={(e) => setForm({ ...form, edition: e.target.value })}
                  placeholder="e.g. 8th edition"
                  className="ui-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Bundle notes</label>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Campus *</label>
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
            <label className="block text-sm font-medium mb-2">Pickup zone *</label>
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

        <div>
          <label className="block text-sm font-medium mb-2">Pickup notes *</label>
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

        <div>
          <label className="block text-sm font-medium mb-2">Tags (optional)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="ui-input"
          />
          <p className="mt-1 text-xs text-[var(--m-muted)]">Comma-separated. Up to 5 tags.</p>
        </div>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="ui-btn-primary flex-1">
            {submitting ? 'Saving changes...' : 'Save changes'}
          </button>
          <a href="/my-listings" className="ui-btn-secondary">
            Cancel
          </a>
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? 'Deleting...' : 'Delete listing'}
        </button>
      </form>
    </div>
  )
}
