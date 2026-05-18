import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { UserAccountState, UserRole } from '@/lib/types'
import {
  usersFindById,
  usersUpdateRole,
  usersUpdateAccountState,
  adminActivityCreate,
} from '@/lib/data/supabaseDataAccess'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = await requireActiveAdmin(request)
    if (!admin.ok) return admin.response
    const { session } = admin

    const user = await usersFindById(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    let updated = user

    if (body?.role !== undefined) {
      const role = body.role as UserRole
      if (role !== 'student' && role !== 'admin') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      if (user.id === session.userId && role !== 'admin') {
        return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 })
      }

      const roleUpdated = await usersUpdateRole(user.id, role)
      if (!roleUpdated) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      updated = roleUpdated
      await adminActivityCreate({
        actorUserId: session.userId,
        actorDisplayName: session.displayName,
        action: role === 'admin' ? 'user-role-promoted' : 'user-role-demoted',
        targetType: 'user',
        targetId: user.id,
        notes: `${user.displayName} -> ${role}`,
      })
    }

    if (body?.accountState !== undefined) {
      const accountState = body.accountState as UserAccountState
      if (accountState !== 'active' && accountState !== 'suspended') {
        return NextResponse.json({ error: 'Invalid account state' }, { status: 400 })
      }
      if (user.id === session.userId && accountState !== 'active') {
        return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 })
      }

      const stateUpdated = await usersUpdateAccountState(user.id, accountState)
      if (!stateUpdated) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      updated = stateUpdated
      await adminActivityCreate({
        actorUserId: session.userId,
        actorDisplayName: session.displayName,
        action: accountState === 'suspended' ? 'user-suspended' : 'user-activated',
        targetType: 'user',
        targetId: user.id,
        notes: `${user.displayName} -> ${accountState}`,
      })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update user state' }, { status: 500 })
  }
}
