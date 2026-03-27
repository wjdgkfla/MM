import { NextRequest, NextResponse } from 'next/server'
import { dataAccess } from '@/lib/data'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

function toDateOrNull(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

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

    const users = dataAccess.users.findAll()
    const listings = dataAccess.listings.findMany()
    const reports = dataAccess.reports.listAll()
    const adminActivity = dataAccess.adminActivity.listAll()

    const messageMap = new Map<string, ReturnType<typeof dataAccess.messages.listByListing>[number]>()
    for (const listing of listings) {
      const listingMessages = dataAccess.messages.listByListing(listing.id)
      for (const message of listingMessages) {
        messageMap.set(message.id, message)
      }
    }
    const messages = Array.from(messageMap.values())

    const writes: Promise<unknown>[] = []

    for (const user of users) {
      writes.push(
        db.collection('users').doc(user.id).set(
          {
            ...user,
            joinedAt: toDateOrNull(user.joinedAt),
            lastActiveAt: toDateOrNull(user.lastActiveAt),
            updatedAt: new Date(),
          },
          { merge: true }
        )
      )
    }

    for (const listing of listings) {
      writes.push(
        db.collection('listings').doc(listing.id).set(
          {
            ...listing,
            createdAt: toDateOrNull(listing.createdAt),
            updatedAt: toDateOrNull(listing.updatedAt),
          },
          { merge: true }
        )
      )
    }

    for (const message of messages) {
      writes.push(
        db.collection('messages').doc(message.id).set(
          {
            ...message,
            createdAt: toDateOrNull(message.createdAt),
          },
          { merge: true }
        )
      )
    }

    for (const report of reports) {
      writes.push(
        db.collection('reports').doc(report.id).set(
          {
            ...report,
            createdAt: toDateOrNull(report.createdAt),
          },
          { merge: true }
        )
      )
    }

    for (const activity of adminActivity) {
      writes.push(
        db.collection('adminActivity').doc(activity.id).set(
          {
            ...activity,
            createdAt: toDateOrNull(activity.createdAt),
          },
          { merge: true }
        )
      )
    }

    await Promise.all(writes)

    return NextResponse.json({
      ok: true,
      counts: {
        users: users.length,
        listings: listings.length,
        messages: messages.length,
        reports: reports.length,
        adminActivity: adminActivity.length,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to seed Firebase data' }, { status: 500 })
  }
}
