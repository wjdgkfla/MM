import webpush from 'web-push'

function getPushConfig() {
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject    = process.env.VAPID_SUBJECT || 'mailto:admin@gmu.edu'
  if (!publicKey || !privateKey || publicKey.startsWith('placeholder') || privateKey.startsWith('placeholder')) {
    return null
  }
  return { publicKey, privateKey, subject }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

// The push service returns 404/410 when a subscription is permanently gone
// (browser uninstalled, permission revoked, endpoint expired). Retrying those
// forever is wasted work, so prune them once confirmed dead.
export function isGoneSubscription(reason: unknown): boolean {
  const statusCode = (reason as { statusCode?: number } | null)?.statusCode
  return statusCode === 404 || statusCode === 410
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const config = getPushConfig()
  if (!config) return // VAPID not configured — skip silently

  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase/server')
    const db = getSupabaseAdmin()
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      )
    )

    const deadEndpoints = results
      .map((result, i) => (result.status === 'rejected' && isGoneSubscription(result.reason) ? subs[i].endpoint : null))
      .filter((endpoint): endpoint is string => endpoint !== null)

    if (deadEndpoints.length > 0) {
      await db.from('push_subscriptions').delete().eq('user_id', userId).in('endpoint', deadEndpoints)
    }
  } catch (err) {
    console.error('sendPushToUser error:', err)
  }
}
