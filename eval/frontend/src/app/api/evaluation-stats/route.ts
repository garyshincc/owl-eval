import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get group filter from URL params
    const { searchParams } = new URL(request.url)
    const groupFilter = searchParams.get('group')
    
    // Build where clause for filtering
    const whereClause = {
      experiment: {
        archived: false,
        ...(groupFilter && { group: groupFilter })
      }
    }
    
    // Build where clause for evaluations that excludes anonymous participants
    const evaluationWhereClause = {
      ...whereClause,
      participant: {
        id: {
          not: {
            startsWith: 'anon-session-'
          }
        }
      }
    }
    
    // Get total counts - only completed evaluations from non-archived experiments
    const [totalComparisons, totalEvaluations] = await Promise.all([
      prisma.comparison.count({
        where: whereClause
      }),
      prisma.evaluation.count({
        where: {
          status: 'completed',
          ...evaluationWhereClause
        }
      })
    ])

    // Get evaluations by scenario using a simpler approach - only completed evaluations from non-archived experiments
    const comparisons = await prisma.comparison.findMany({
      where: whereClause,
      select: {
        id: true,
        scenarioId: true,
        _count: {
          select: {
            evaluations: {
              where: {
                status: 'completed',
                participant: {
                  id: {
                    not: {
                      startsWith: 'anon-session-'
                    }
                  }
                }
              }
            }
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