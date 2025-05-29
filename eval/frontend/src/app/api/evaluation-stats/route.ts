import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get total counts
    const [totalComparisons, totalEvaluations] = await Promise.all([
      prisma.comparison.count(),
      prisma.evaluation.count()
    ])

    // Get evaluations by scenario using a simpler approach
    const comparisons = await prisma.comparison.findMany({
      select: {
        id: true,
        scenarioId: true,
        _count: {
          select: {
            evaluations: true
          }
        }
      }
    })

    const evaluationsByScenario: Record<string, number> = {}
    for (const comparison of comparisons) {
      const scenario = comparison.scenarioId
      if (!evaluationsByScenario[scenario]) {
        evaluationsByScenario[scenario] = 0
      }
      evaluationsByScenario[scenario] += comparison._count.evaluations
    }
    
    return NextResponse.json({
      total_comparisons: totalComparisons,
      total_evaluations: totalEvaluations,
      evaluations_by_scenario: evaluationsByScenario,
      target_evaluations_per_comparison: 5 // Default target
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({
      total_comparisons: 0,
      total_evaluations: 0,
      evaluations_by_scenario: {},
      target_evaluations_per_comparison: 5
    })
  }
}