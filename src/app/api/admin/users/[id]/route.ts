import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { UserAccountState, UserRole } from '@/lib/types'
import {
  usersFindById,
  usersUpdateRole,
  usersUpdateAccountState,
  adminActivityCreate,
} from '@/lib/data/supabaseDataAccess'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const user = await usersFindById(params.id)
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
