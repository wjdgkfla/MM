import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { REPORT_REASONS, REPORT_STATUSES, ReportReason, ReportStatus } from '@/lib/types'
import {
  listingsFindById,
  reportsListAll,
  reportsCreate,
  reportsUpdateStatus,
  reportsFindByUserAndListing,
  adminActivityCreate,
  usersFindById,
} from '@/lib/data/firestoreDataAccess'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const reports = await reportsListAll()
    return NextResponse.json(reports)
  } catch {
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const sessionUser = await usersFindById(session.userId)
    if (sessionUser?.accountState === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })
    }

    const body = await request.json()
    const listingId = String(body?.listingId || '').trim()
    const reason = body?.reason as ReportReason
    const notes = String(body?.notes || '').trim()
    const includeSeller = Boolean(body?.includeSeller)

    if (!listingId) {
      return NextResponse.json({ error: 'Listing is required' }, { status: 400 })
    }
    if (!REPORT_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 })
    }
    if (notes.length > 500) {
      return NextResponse.json({ error: 'Notes must be 500 characters or less' }, { status: 400 })
    }

    const listing = await listingsFindById(listingId)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    if (listing.sellerId === session.userId) {
      return NextResponse.json({ error: 'You cannot report your own listing' }, { status: 400 })
    }

    const existingReport = await reportsFindByUserAndListing(session.userId, listingId)
    if (existingReport) {
      return NextResponse.json({ error: 'You have already reported this listing' }, { status: 409 })
    }

    const report = await reportsCreate({
      listingId: listing.id,
      sellerId: listing.sellerId,
      reportedByUserId: session.userId,
      reason,
      notes: notes || undefined,
      includeSeller,
    })

    return NextResponse.json(report, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const reportId = String(body?.reportId || '').trim()
    const status = body?.status as ReportStatus

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
    }
    if (!REPORT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid report status' }, { status: 400 })
    }

    const updated = await reportsUpdateStatus(reportId, status)
    if (!updated) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await adminActivityCreate({
      actorUserId: session.userId,
      actorDisplayName: session.displayName,
      action:
        status === 'reviewed'
          ? 'report-reviewed'
          : status === 'resolved'
          ? 'report-resolved'
          : 'report-reopened',
      targetType: 'report',
      targetId: updated.id,
      notes: `${updated.reason} (${updated.listingId})`,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
