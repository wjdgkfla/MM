import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'
import { usersFindById } from '@/lib/data/supabaseDataAccess'

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

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Storage is not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    if (files.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 images allowed' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const uploadedUrls: string[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Each image must be under 5MB' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
      const path = `listings/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(path, buffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }

      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(path)
      uploadedUrls.push(urlData.publicUrl)
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'No valid image files were provided' }, { status: 400 })
    }

    return NextResponse.json({ urls: uploadedUrls })
  } catch (err) {
    console.error('POST /api/upload error:', err)
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 })
  }
}
