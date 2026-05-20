import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await request.json()
    const { endpoint, keys } = body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await getSupabaseAdmin()
      .from('push_subscriptions')
      .upsert(
        { user_id: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'user_id,endpoint', ignoreDuplicates: false }
      )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/push/subscribe error:', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const { endpoint } = await request.json()
    await getSupabaseAdmin()
      .from('push_subscriptions')
      .delete()
      .eq('user_id', session.userId)
      .eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/push/subscribe error:', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
