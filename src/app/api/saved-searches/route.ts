import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  savedSearchesCreate,
  savedSearchesListByUser,
  savedSearchesRemove,
} from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    return NextResponse.json(await savedSearchesListByUser(session.userId))
  } catch (err) {
    console.error('GET /api/saved-searches error:', err)
    return NextResponse.json({ error: 'Failed to load saved searches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const body = await request.json()
    const label = String(body.label || body.query || 'Saved search').trim().slice(0, 80)
    const query = String(body.query || '').trim().slice(0, 120)
    const filters = body.filters && typeof body.filters === 'object' ? body.filters : {}
    // Cap stored filter payload — it's client-supplied JSON persisted verbatim
    if (JSON.stringify(filters).length > 2000) {
      return NextResponse.json({ error: 'Filters payload is too large' }, { status: 400 })
    }
    return NextResponse.json(await savedSearchesCreate({ userId: session.userId, label, query, filters }))
  } catch (err) {
    console.error('POST /api/saved-searches error:', err)
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing saved search id' }, { status: 400 })
  return NextResponse.json({ ok: await savedSearchesRemove(session.userId, id) })
}
