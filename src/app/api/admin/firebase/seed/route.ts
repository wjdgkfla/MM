import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    const [users, listings, messages, reports, activity] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('listings').select('*', { count: 'exact', head: true }),
      db.from('messages').select('*', { count: 'exact', head: true }),
      db.from('reports').select('*', { count: 'exact', head: true }),
      db.from('admin_activity').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      ok: true,
      mode: 'supabase',
      message: 'Connected to Supabase. Counts reflect current database state.',
      counts: {
        users: users.count ?? 0,
        listings: listings.count ?? 0,
        messages: messages.count ?? 0,
        reports: reports.count ?? 0,
        adminActivity: activity.count ?? 0,
      },
    })
  } catch (err) {
    console.error('POST /api/admin/firebase/seed error:', err)
    return NextResponse.json({ error: 'Failed to check database' }, { status: 500 })
  }
}
