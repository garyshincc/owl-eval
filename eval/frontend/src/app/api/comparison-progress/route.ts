import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface ComparisonProgress {
  id: string
  scenarioId: string
  modelA: string
  modelB: string
  evaluationCount: number
  targetEvaluations: number
  progressPercentage: number
}

export async function GET() {
  try {
    // Get all comparisons with their evaluation counts
    const comparisons = await prisma.comparison.findMany({
      include: {
        _count: {
          select: {
            evaluations: true
          }
        }
      },
      orderBy: {
        scenarioId: 'asc'
      }
    })

    const targetEvaluations = 5 // Default target per comparison

    const progressData: ComparisonProgress[] = comparisons.map(comparison => ({
      id: comparison.id,
      scenarioId: comparison.scenarioId,
      modelA: comparison.modelA,
      modelB: comparison.modelB,
      evaluationCount: comparison._count.evaluations,
      targetEvaluations,
      progressPercentage: Math.round((comparison._count.evaluations / targetEvaluations) * 100)
    }))
    
    return NextResponse.json(progressData)
  } catch (error) {
    console.error('Error fetching comparison progress:', error)
    return NextResponse.json([])
  }
}