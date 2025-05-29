import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comparison = await prisma.comparison.findUnique({
      where: { id },
      include: {
        experiment: {
          select: {
            name: true,
            config: true
          }
        }
      }
    })

    if (!comparison) {
      return NextResponse.json(
        { error: 'Comparison not found' },
        { status: 404 }
      )
    }

    // Import scenarios to get metadata
    const { PREDEFINED_SCENARIOS } = await import('@/lib/scenarios')
    
    // Find scenario metadata
    const scenario = PREDEFINED_SCENARIOS.find(s => s.id === comparison.scenarioId)
    
    // Format the response to match the expected structure
    const formattedComparison = {
      comparison_id: comparison.id,
      scenario_id: comparison.scenarioId,
      scenario_metadata: scenario ? {
        name: scenario.name,
        description: scenario.description
      } : (comparison.metadata || {
        name: comparison.scenarioId,
        description: `Custom scenario: ${comparison.scenarioId}`
      }),
      model_a_video_path: comparison.videoAPath,
      model_b_video_path: comparison.videoBPath,
      randomized_labels: {
        A: comparison.modelA,
        B: comparison.modelB
      }
    }

    return NextResponse.json(formattedComparison)
  } catch (error) {
    console.error('Error fetching comparison:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison' },
      { status: 500 }
    )
  }
}