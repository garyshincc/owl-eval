import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get filters from URL params
    const { searchParams } = new URL(request.url)
    const groupFilter = searchParams.get('group')
    const includeAnonymous = searchParams.get('includeAnonymous') === 'true'
    
    // Build where clause for filtering
    const whereClause = {
      experiment: {
        archived: false,
        ...(groupFilter && { group: groupFilter })
      }
    }
    
    // Build where clause for evaluations based on anonymous inclusion
    const evaluationWhereClause = includeAnonymous ? {
      ...whereClause,
      participant: {
        status: {
          not: 'returned'  // Always exclude returned participants
        }
      }
    } : {
      ...whereClause,
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
    
    // Get total counts - only completed evaluations from non-archived experiments
    const [totalComparisons, totalEvaluations, totalVideoTasks, totalSingleVideoEvaluations] = await Promise.all([
      prisma.comparison.count({
        where: whereClause
      }),
      prisma.evaluation.count({
        where: {
          status: 'completed',
          ...evaluationWhereClause
        }
      }),
      prisma.videoTask.count({
        where: whereClause
      }),
      prisma.singleVideoEvaluation.count({
        where: {
          status: 'completed',
          ...evaluationWhereClause
        }
      })
    ])

    // Get evaluations by scenario for both comparison and single video evaluations
    const [comparisons, videoTasks] = await Promise.all([
      prisma.comparison.findMany({
        where: whereClause,
        select: {
          id: true,
          scenarioId: true,
          _count: {
            select: {
              evaluations: includeAnonymous ? {
                where: {
                  status: 'completed',
                  participant: {
                    status: {
                      not: 'returned'  // Always exclude returned participants
                    }
                  }
                }
              } : {
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
          }
        }
      }),
      prisma.videoTask.findMany({
        where: whereClause,
        select: {
          id: true,
          scenarioId: true,
          _count: {
            select: {
              singleVideoEvals: includeAnonymous ? {
                where: {
                  status: 'completed',
                  participant: {
                    status: {
                      not: 'returned'  // Always exclude returned participants
                    }
                  }
                }
              } : {
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
          }
        }
      })
    ])

    const evaluationsByScenario: Record<string, number> = {}
    
    // Add comparison evaluations by scenario
    for (const comparison of comparisons) {
      const scenario = comparison.scenarioId
      if (!evaluationsByScenario[scenario]) {
        evaluationsByScenario[scenario] = 0
      }
      evaluationsByScenario[scenario] += comparison._count.evaluations
    }
    
    // Add single video evaluations by scenario
    for (const videoTask of videoTasks) {
      const scenario = videoTask.scenarioId
      if (!evaluationsByScenario[scenario]) {
        evaluationsByScenario[scenario] = 0
      }
      evaluationsByScenario[scenario] += videoTask._count.singleVideoEvals
    }
    
    return NextResponse.json({
      total_comparisons: totalComparisons,
      total_evaluations: totalEvaluations + totalSingleVideoEvaluations,
      total_video_tasks: totalVideoTasks,
      total_single_video_evaluations: totalSingleVideoEvaluations,
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