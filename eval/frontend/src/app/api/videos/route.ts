import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: {
        uploadedAt: 'desc'
      }
    })
    
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Fetch videos error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const video = await prisma.video.create({
      data: {
        key: body.key,
        name: body.name,
        url: body.url,
        size: body.size,
        duration: body.duration,
        metadata: body.metadata || {},
        tags: body.tags || [],
        groups: body.groups || [],
        modelName: body.modelName,
        scenarioId: body.scenarioId
      }
    })
    
    return NextResponse.json(video)
  } catch (error) {
    console.error('Create video error:', error)
    return NextResponse.json(
      { error: 'Failed to create video record' },
      { status: 500 }
    )
  }
}