import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isVisibleToPublic } from '@/lib/utils/status'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export const dynamic = 'force-dynamic'

async function withDatabaseRetry<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const isRetryableError = error instanceof PrismaClientKnownRequestError && 
      ['P1001', 'P1008', 'P1017', 'P2024'].includes(error.code)
    
    if (isRetryableError && retryCount < 2) {
      console.warn(`Database operation failed (attempt ${retryCount + 1}/3). Retrying...`, error.code)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      return withDatabaseRetry(operation, retryCount + 1)
    }
    
    throw error
  }
}

export async function GET(request: Request) {
  try {
    // Get experiment ID from session storage if this is a Prolific participant
    const url = new URL(request.url)
    const experimentId = url.searchParams.get('experimentId')
    
    let comparisons
    
    if (experimentId) {
      // Get comparisons for specific experiment
      comparisons = await withDatabaseRetry(() => 
        prisma.twoVideoComparisonTask.findMany({
          where: { experimentId },
          include: {
            experiment: {
              select: {
                name: true,
                createdAt: true
              }
            },
            _count: {
              select: { 
                twoVideoComparisonSubmissions: {
                  where: {
                    status: 'completed'
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      )
    } else {
      // Get all public-visible experiments' comparisons for non-Prolific users
      const publicExperiments = await withDatabaseRetry(() =>
        prisma.experiment.findMany({
          select: { id: true, status: true }
        })
      )
      
      // Filter experiments that are visible to public
      const visibleExperimentIds = publicExperiments
        .filter(exp => isVisibleToPublic(exp.status))
        .map(exp => exp.id)
      
      comparisons = await withDatabaseRetry(() =>
        prisma.twoVideoComparisonTask.findMany({
        where: {
          experimentId: {
            in: visibleExperimentIds
          }
        },
        include: {
          experiment: {
            select: {
              name: true,
              createdAt: true
            }
          },
          _count: {
            select: { 
              twoVideoComparisonSubmissions: {
                where: {
                  status: 'completed'
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      )
    }
    
    const comparisonList = comparisons.map(comparison => ({
      comparison_id: comparison.id,
      scenario_id: comparison.scenarioId,
      created_at: comparison.createdAt.toISOString(),
      num_evaluations: comparison._count.twoVideoComparisonSubmissions,
      evaluation_url: `/evaluate/${comparison.id}`,
      experiment_name: comparison.experiment?.name,
      experiment_created_at: comparison.experiment?.createdAt.toISOString()
    }))
    
    return NextResponse.json(comparisonList)
  } catch (error) {
    console.error('Error fetching comparisons:', error)
    
    if (error instanceof PrismaClientKnownRequestError) {
      const errorMessage = error.code === 'P1001' ? 'Database connection timeout' : 'Database error'
      return NextResponse.json({ error: errorMessage }, { status: 503 })
    }
    
    return NextResponse.json({ error: 'Failed to fetch comparisons' }, { status: 500 })
  }
}