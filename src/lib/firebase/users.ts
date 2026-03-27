import { FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { UserRole } from '@/lib/types'

type SyncUserInput = {
  id: string
  email: string
  displayName: string
  role: UserRole
  gmuVerified: boolean
}

export async function syncUserToFirebase(input: SyncUserInput) {
  if (!isFirebaseAdminConfigured()) {
    return { synced: false as const, reason: 'firebase-not-configured' as const }
  }

  const db = getFirebaseAdminDb()
  if (!db) {
    return { synced: false as const, reason: 'firebase-init-failed' as const }
  }

  await db
    .collection('users')
    .doc(input.id)
    .set(
      {
        id: input.id,
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        gmuEmailVerified: input.gmuVerified,
        updatedAt: FieldValue.serverTimestamp(),
        lastSignInAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

  return { synced: true as const }
}
