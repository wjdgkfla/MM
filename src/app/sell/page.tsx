'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Category, Condition, CampusLocation, PickupZone } from '@/lib/types'
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS, PICKUP_ZONE_LABELS } from '@/lib/types'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { AuthRequiredCard } from '@/components/AuthRequiredCard'

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
  const { session, loading: authLoading } = useAuthSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [form, setForm] = useState<SellFormState>({
    title: '',
    price: '',
    category: 'textbooks',
    condition: 'good',
    description: '',
    campusLocation: 'fairfax',
    pickupZone: 'jc-lobby',
    pickupNotes: 'Meet at Johnson Center lobby around lunch time.',
    courseCode: '',
    professorName: '',
    edition: '',
    bundleNotes: '',
    tags: '',
  })

  const parsedTags = useMemo(
    () =>
      form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5),
    [form.tags]
  )

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 4)
    if (files.length === 0) {
      setImagePreviews([])
      setImageFiles([])
      return
    }

    try {
      const urls = await filesToDataUrls(files)
      setImagePreviews(urls)
      setImageFiles(files)
    } catch {
      setError('Could not load selected images. Please try different files.')
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUploadWarning('')

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
      router.push(`/item/${listing.id}`)
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
    return <div className="max-w-2xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>
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
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-[#006633] mb-2">Post an item</h1>
      <p className="text-gray-600 mb-8">Quick listing for GMU students. Most posts take under 2 minutes.</p>

      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        Signed in as <span className="font-medium">{session.displayName}</span> ({session.email}) with the{' '}
        <span className="font-medium">{session.role}</span> role.
      </div>

      <form onSubmit={handleSubmit} className="ui-surface space-y-5 p-4 sm:p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos (optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#006633] file:px-3 file:py-2 file:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">Up to 4 images (5MB each). Uploaded to Firebase Storage.</p>
          {imagePreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {imagePreviews.map((src, index) => (
                <div key={`${src}-${index}`} className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200">
                  <Image src={src} alt={`Preview ${index + 1}`} fill className="object-cover" unoptimized />
                </div>
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
            placeholder="e.g. TI-84 calculator used in STAT 250"
            className="ui-input"
          />
        </div>

        <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
          <p className="text-sm font-medium text-gray-800 mb-3">Basic details</p>
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
              placeholder="0"
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
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

        <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
          <p className="text-sm font-medium text-gray-800 mb-3">Pickup setup</p>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pickup notes *</label>
          <input
            type="text"
            required
            value={form.pickupNotes}
            onChange={(e) => setForm({ ...form, pickupNotes: e.target.value })}
            placeholder="Best meetup time / landmark"
            className="ui-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags (optional)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="exam prep, move-out, pickup today"
            className="ui-input"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated. Up to 5 tags.</p>
        </div>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {uploadWarning ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{uploadWarning}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="ui-btn-primary flex-1"
          >
            {submitting ? 'Posting...' : 'Post listing'}
          </button>
          <a href="/my-listings" className="ui-btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
