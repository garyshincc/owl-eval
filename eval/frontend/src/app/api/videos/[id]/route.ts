import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = await prisma.video.findUnique({
      where: { id }
    })
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(video)
  } catch (error) {
    console.error('Fetch video error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const video = await prisma.video.update({
      where: { id },
      data: {
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.groups !== undefined && { groups: body.groups }),
        ...(body.modelName !== undefined && { modelName: body.modelName }),
        ...(body.scenarioId !== undefined && { scenarioId: body.scenarioId }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(video)
  } catch (error) {
    console.error('Update video error:', error)
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.video.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete video error:', error)
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    )
  }
}