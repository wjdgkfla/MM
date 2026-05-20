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

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const config = getPushConfig()
  if (!config) return // VAPID not configured — skip silently

  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase/server')
    const { data: subs } = await getSupabaseAdmin()
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      )
    )
  } catch (err) {
    console.error('sendPushToUser error:', err)
  }
}
