import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { getFirebaseAdminStorage, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Firebase Storage is not configured' },
        { status: 500 }
      )
    }

    const storage = getFirebaseAdminStorage()
    if (!storage) {
      return NextResponse.json({ error: 'Failed to initialize Firebase Storage' }, { status: 500 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 images allowed' }, { status: 400 })
    }

    const bucket = storage.bucket()
    const uploadedUrls: string[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Each image must be under 5MB' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.type.split('/')[1] || 'jpg'
      const filename = `listings/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const blob = bucket.file(filename)
      await blob.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedBy: session.userId,
          },
        },
      })

      await blob.makePublic()
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`
      uploadedUrls.push(publicUrl)
    }

    return NextResponse.json({ urls: uploadedUrls })
  } catch (err) {
    console.error('POST /api/upload error:', err)
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 })
  }
}
