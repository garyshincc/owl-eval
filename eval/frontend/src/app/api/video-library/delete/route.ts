import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'

// Configure S3 client for Tigris
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true
})

export async function DELETE(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { keys } = await request.json()

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: 'No video keys provided' },
        { status: 400 }
      )
    }

    // Validate that all keys are in the video-library prefix for security
    const validKeys = keys.filter(key => key.startsWith('video-library/'))
    
    if (validKeys.length !== keys.length) {
      return NextResponse.json(
        { error: 'Some keys are not valid video library keys' },
        { status: 400 }
      )
    }

    const command = new DeleteObjectsCommand({
      Bucket: process.env.TIGRIS_BUCKET_NAME,
      Delete: {
        Objects: validKeys.map(key => ({ Key: key })),
        Quiet: false
      }
    })

    const response = await s3Client.send(command)

    return NextResponse.json({ 
      success: true,
      deleted: response.Deleted?.length || 0,
      errors: response.Errors || []
    })
  } catch (error) {
    console.error('Error deleting videos:', error)
    return NextResponse.json(
      { error: 'Failed to delete videos' },
      { status: 500 }
    )
  }
}