import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { isValidEntityId } from '@/lib/validators'
import { usersFindById, blocksCreate, blocksRemove, blocksListByUser } from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    return NextResponse.json(await blocksListByUser(session.userId))
  } catch (err) {
    console.error('GET /api/blocks error:', err)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await request.json()
    const blockedId = String(body?.blockedId || '').trim()

    if (!blockedId || !isValidEntityId(blockedId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    if (blockedId === session.userId) {
      return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 })
    }

    const blockedUser = await usersFindById(blockedId)
    if (!blockedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const ok = await blocksCreate(session.userId, blockedId)
    if (!ok) return NextResponse.json({ error: 'Failed to block user' }, { status: 500 })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/blocks error:', err)
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const blockedId = searchParams.get('blockedId')
  if (!blockedId || !isValidEntityId(blockedId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const deleted = await blocksRemove(session.userId, blockedId)
  if (!deleted) return NextResponse.json({ error: 'Block not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
