import { NextResponse } from 'next/server'
import { listingsCountByCategory } from '@/lib/data/supabaseDataAccess'

export async function GET() {
  try {
    const counts = await listingsCountByCategory()
    return NextResponse.json(counts)
  } catch (err) {
    console.error('GET /api/listings/category-counts error:', err)
    return NextResponse.json({ error: 'Failed to load category counts' }, { status: 500 })
  }
}
