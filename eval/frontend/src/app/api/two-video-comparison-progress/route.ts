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
    const comparisons = await prisma.twoVideoComparisonTask.findMany({
      include: {
        _count: {
          select: {
            twoVideoComparisonSubmissions: {
              where: {
                status: 'completed',
                participant: {
                  AND: [
                    {
                      id: {
                        not: {
                          startsWith: 'anon-session-'
                        }
                      }
                    },
                    {
                      status: {
                        not: 'returned'  // Always exclude returned participants
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        experiment: {
          select: {
            config: true
          }
        }
      },
      orderBy: {
        scenarioId: 'asc'
      }
    })

    const progressData: ComparisonProgress[] = comparisons.map(comparison => {
      let targetEvaluations = 0

      if (comparison.experiment?.config) {
        try {
          const config = typeof comparison.experiment.config === 'string'
            ? JSON.parse(comparison.experiment.config)
            : comparison.experiment.config

          if (typeof config.evaluationsPerComparison === 'number') {
            targetEvaluations = config.evaluationsPerComparison
          }
        } catch (e) {
          console.warn('Invalid JSON in experiment.config for comparison', comparison.id)
        }
      }

      return {
        id: comparison.id,
        scenarioId: comparison.scenarioId,
        modelA: comparison.modelA,
        modelB: comparison.modelB,
        evaluationCount: comparison._count.twoVideoComparisonSubmissions,
        targetEvaluations,
        progressPercentage: targetEvaluations > 0
          ? Math.round((comparison._count.twoVideoComparisonSubmissions / targetEvaluations) * 100)
          : 0
      }
    })

    return NextResponse.json(progressData)
  } catch (error) {
    console.error('Error fetching comparison progress:', error)
    return NextResponse.json([])
  }
}
