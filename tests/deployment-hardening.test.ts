import assert from 'node:assert/strict'
import test from 'node:test'
import { isActiveAdminUser } from '../src/lib/auth/admin'
import { validateImageFile } from '../src/lib/uploadValidation'
import { normalizeListingInput } from '../src/lib/listingValidation'
import type { AuthSession } from '../src/lib/auth/types'
import type { User } from '../src/lib/types'

const session: AuthSession = {
  userId: 'admin-1',
  role: 'admin',
  email: 'admin@gmu.edu',
  displayName: 'Admin',
  gmuVerified: true,
  issuedAt: new Date().toISOString(),
}

const activeAdmin: User = {
  id: 'admin-1',
  role: 'admin',
  accountState: 'active',
  displayName: 'Admin',
  gmuEmail: 'admin@gmu.edu',
  gmuEmailVerified: true,
  isStudentSeller: false,
  homeCampus: 'fairfax',
  campusVerification: 'verified',
  lastActiveAt: new Date().toISOString(),
  joinedAt: new Date().toISOString(),
  trustBadge: 'verified-gmu',
  reputationScore: 5,
  listingCount: 0,
}

test('active admin check requires both signed admin session and active admin database user', () => {
  assert.equal(isActiveAdminUser(session, activeAdmin), true)
  assert.equal(isActiveAdminUser({ ...session, role: 'student' }, activeAdmin), false)
  assert.equal(isActiveAdminUser(session, { ...activeAdmin, role: 'student' }), false)
  assert.equal(isActiveAdminUser(session, { ...activeAdmin, accountState: 'suspended' }), false)
  assert.equal(isActiveAdminUser(session, null), false)
})

test('image validation allows only jpg png webp with matching bytes', async () => {
  const jpg = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xdb])], 'photo.jpg', { type: 'image/jpeg' })
  const svg = new File([new TextEncoder().encode('<svg></svg>')], 'bad.svg', { type: 'image/svg+xml' })
  const fakePng = new File([new TextEncoder().encode('not a png')], 'fake.png', { type: 'image/png' })

  assert.equal((await validateImageFile(jpg)).ok, true)
  assert.equal((await validateImageFile(svg)).ok, false)
  assert.equal((await validateImageFile(fakePng)).ok, false)
})

test('listing normalization enforces shared rules and Supabase image URLs', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'

  const base = {
    title: 'Desk lamp',
    description: 'A good desk lamp for studying.',
    price: 12,
    category: 'electronics',
    condition: 'good',
    campusLocation: 'fairfax',
    pickupZone: 'jc-lobby',
    pickupNotes: 'Meet near the entrance',
    tags: [' Study ', 'Dorm!!'],
    imageUrls: ['https://abc.supabase.co/storage/v1/object/public/listings/user/photo.jpg'],
  }

  const normalized = normalizeListingInput(base)
  assert.equal(normalized.ok, true)
  assert.deepEqual(normalized.ok ? normalized.value.tags : [], ['study', 'dorm'])

  const shortTitle = normalizeListingInput({ ...base, title: 'abc' })
  assert.deepEqual(shortTitle, { ok: false, error: 'Title should be at least 5 characters' })

  const wrongZone = normalizeListingInput({ ...base, campusLocation: 'arlington', pickupZone: 'jc-lobby' })
  assert.equal(wrongZone.ok, false)

  const externalImage = normalizeListingInput({
    ...base,
    imageUrls: ['https://example.com/image.jpg'],
  })
  assert.deepEqual(externalImage, { ok: false, error: 'Invalid listing image URL' })
})
