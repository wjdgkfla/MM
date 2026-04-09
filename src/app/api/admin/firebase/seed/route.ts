import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Firebase Admin is not configured. Add FIREBASE_* env vars first.' },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()
    if (!db) {
      return NextResponse.json({ error: 'Failed to initialize Firebase Admin.' }, { status: 500 })
    }

    const [usersCount, listingsCount, messagesCount, reportsCount, adminActivityCount] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('listings').count().get(),
      db.collection('messages').count().get(),
      db.collection('reports').count().get(),
      db.collection('adminActivity').count().get(),
    ])

    return NextResponse.json({
      ok: true,
      mode: 'firebase-only',
      message: 'Firebase-only mode is active. Local seed data is disabled.',
      counts: {
        users: usersCount.data().count,
        listings: listingsCount.data().count,
        messages: messagesCount.data().count,
        reports: reportsCount.data().count,
        adminActivity: adminActivityCount.data().count,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to seed Firebase data' }, { status: 500 })
  }
}
