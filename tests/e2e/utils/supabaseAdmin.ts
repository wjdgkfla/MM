import { createClient } from '@supabase/supabase-js'

// Same pattern as src/lib/supabase/server.ts's getSupabaseAdmin — a
// service-role client, but kept separate here so the E2E suite doesn't
// import application source and can run against any target environment.
export function getE2eSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set these in .env.local ' +
        'to run the E2E suite against a real Supabase project.'
    )
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function getE2eSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — set these in .env.local ' +
        'to run the E2E suite against a real Supabase project.'
    )
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
