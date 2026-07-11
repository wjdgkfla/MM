import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  notificationsListByUser,
  notificationsMarkAllRead,
  notificationsMarkRead,
} from '@/lib/data/supabaseDataAccess'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    return NextResponse.json(await notificationsListByUser(session.userId))
  } catch (err) {
    console.error('GET /api/notifications error:', err)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await request.json()
    if (body?.all === true) {
      await notificationsMarkAllRead(session.userId)
      return NextResponse.json({ ok: true })
    }

    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Missing notification id' }, { status: 400 })
    const notification = await notificationsMarkRead(session.userId, id)
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    return NextResponse.json(notification)
  } catch (err) {
    console.error('PATCH /api/notifications error:', err)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
