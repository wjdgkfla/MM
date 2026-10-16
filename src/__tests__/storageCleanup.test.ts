import { deleteListingStorageObjects } from '@/lib/uploadValidation'
import { getSupabaseAdmin } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ getSupabaseAdmin: jest.fn() }))

const remove = jest.fn()
const base = 'https://proj.supabase.co/storage/v1/object/public/listings/'

describe('deleteListingStorageObjects', () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
    remove.mockResolvedValue({ error: null })
    jest.mocked(getSupabaseAdmin).mockReturnValue({ storage: { from: () => ({ remove }) } } as never)
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original
  })

  test('only deletes objects inside the owner\'s own upload folder', async () => {
    await deleteListingStorageObjects(
      [`${base}listings/me/a.jpg`, `${base}listings/victim/b.jpg`, `${base}listings/me-evil/c.jpg`],
      'me'
    )

    expect(remove).toHaveBeenCalledWith(['listings/me/a.jpg'])
  })

  test('does not call storage when nothing belongs to the owner', async () => {
    await deleteListingStorageObjects([`${base}listings/victim/b.jpg`], 'me')

    expect(remove).not.toHaveBeenCalled()
  })
})
