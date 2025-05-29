import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

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

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.TIGRIS_BUCKET_NAME,
      Prefix: 'video-library/', // Videos in library have this prefix
    })

    const response = await s3Client.send(command)
    
    const videos = (response.Contents || []).map(object => {
      if (!object.Key) return null
      
      // Use direct public URL - consistent with storage.ts format
      const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace('https://', '') || 'fly.storage.tigris.dev'
      const publicUrl = `https://${endpoint}/${process.env.TIGRIS_BUCKET_NAME}/${object.Key}`
      
      return {
        key: object.Key,
        url: publicUrl,
        name: object.Key.split('/').pop() || 'Unknown',
        uploadedAt: object.LastModified || new Date(),
        size: object.Size || 0
      }
    })

    return NextResponse.json(videos.filter(Boolean))
  } catch (error) {
    console.error('Error fetching video library:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video library' },
      { status: 500 }
    )
  }
}