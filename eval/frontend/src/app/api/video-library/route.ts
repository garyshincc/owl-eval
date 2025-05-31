import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const videos = await prisma.video.findMany({
      orderBy: {
        uploadedAt: 'desc'
      }
    })
    
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error fetching video library:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video library' },
      { status: 500 }
    )
  }
}