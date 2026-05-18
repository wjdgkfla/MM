import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin(request)
  if (!admin.ok) return admin.response

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
