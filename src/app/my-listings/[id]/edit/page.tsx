'use client'

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
  PickupZone,
} from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'

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
}

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
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const parsedTags = useMemo(
    () =>
      form.tags
        .split(',')
        .map((tag) => tag.trim())
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
        })
        setImagePreviews(listingData.imageUrls || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load listing')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params?.id, session])

  const validate = () => {
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

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 4)
    if (files.length === 0) {
      setImagePreviews(listing?.imageUrls || [])
      return
    }

    try {
      const urls = await filesToDataUrls(files)
      setImagePreviews(urls)
    } catch {
      setError('Could not load selected images. Please try different files.')
    }
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
          imageUrls: imagePreviews,
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

      router.push(`/item/${listing.id}`)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update listing')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return <div className="max-w-2xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-10 w-2/3 rounded bg-gray-100 animate-pulse" />
        <div className="mt-4 h-80 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-700">Listing unavailable for editing.</p>
        <Link href="/my-listings" className="mt-3 inline-block text-sm font-medium text-[#006633]">
          Back to My Listings
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#006633]">Edit listing</h1>
        <Link href={`/item/${listing.id}`} className="text-sm font-medium text-gray-600 hover:text-[#006633]">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="ui-surface mt-5 space-y-5 p-4 sm:p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos (optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#006633] file:px-3 file:py-2 file:text-white"
          />
          {imagePreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {imagePreviews.map((src, index) => (
                <img key={`${src}-${index}`} src={src} alt={`Preview ${index + 1}`} className="aspect-square w-full rounded-lg border border-gray-200 object-cover" />
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="ui-input"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($) *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="ui-input resize-none"
          />
        </div>

        {form.category === 'textbooks' ? (
          <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
            <p className="text-sm font-medium text-gray-800 mb-3">Course material details (optional)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course code</label>
                <input
                  type="text"
                  value={form.courseCode}
                  onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                  placeholder="e.g. CS 112"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professor</label>
                <input
                  type="text"
                  value={form.professorName}
                  onChange={(e) => setForm({ ...form, professorName: e.target.value })}
                  placeholder="e.g. Prof. Kim"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Edition</label>
                <input
                  type="text"
                  value={form.edition}
                  onChange={(e) => setForm({ ...form, edition: e.target.value })}
                  placeholder="e.g. 8th edition"
                  className="ui-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bundle notes</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Campus *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Pickup zone *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Pickup notes *</label>
          <input
            type="text"
            required
            value={form.pickupNotes}
            onChange={(e) => setForm({ ...form, pickupNotes: e.target.value })}
            className="ui-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags (optional)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="ui-input"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated. Up to 5 tags.</p>
        </div>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button type="submit" disabled={submitting} className="ui-btn-primary w-full">
          {submitting ? 'Saving changes...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
