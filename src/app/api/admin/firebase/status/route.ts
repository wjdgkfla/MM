import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const configured = isSupabaseConfigured()
  if (!configured) {
    return NextResponse.json({ configured: false, connected: false, details: 'Missing Supabase env vars.' })
  }

  try {
    const { data, error } = await getSupabaseAdmin().from('users').select('id', { count: 'exact', head: true })
    if (error) throw error
    return NextResponse.json({ configured: true, connected: true, details: 'Supabase connected.', data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ configured: true, connected: false, details: msg })
  }
}
