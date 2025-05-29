import { NextRequest, NextResponse } from 'next/server'
import { uploadVideoToTigris } from '@/lib/storage'
import { requireAdmin } from '@/lib/auth-middleware'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const formData = await request.formData()
    const file = formData.get('video') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate key for video library (not tied to specific experiment)
    const fileExtension = file.name.split('.').pop() || 'mp4'
    const uniqueId = nanoid(8)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `video-library/${uniqueId}_${sanitizedName}`
    
    // Upload to Tigris
    const videoUrl = await uploadVideoToTigris(buffer, key, file.type)

    return NextResponse.json({ 
      success: true, 
      videoUrl,
      key,
      name: file.name,
      uploadedBy: authResult.user?.id || 'dev-mode'
    })
  } catch (error) {
    console.error('Error uploading video to library:', error)
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    )
  }
}