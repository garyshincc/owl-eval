import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get experiment ID from session storage if this is a Prolific participant
    const url = new URL(request.url)
    const experimentId = url.searchParams.get('experimentId')
    
    let comparisons
    
    if (experimentId) {
      // Get comparisons for specific experiment
      comparisons = await prisma.comparison.findMany({
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
              evaluations: {
                where: {
                  status: 'completed'
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Get all ready/active experiments' comparisons for non-Prolific users
      const activeExperiments = await prisma.experiment.findMany({
        where: { status: { in: ['ready', 'active'] } },
        select: { id: true }
      })
      
      comparisons = await prisma.comparison.findMany({
        where: {
          experimentId: {
            in: activeExperiments.map(e => e.id)
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
              evaluations: {
                where: {
                  status: 'completed'
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    const comparisonList = comparisons.map(comparison => ({
      comparison_id: comparison.id,
      scenario_id: comparison.scenarioId,
      created_at: comparison.createdAt.toISOString(),
      num_evaluations: comparison._count.evaluations,
      evaluation_url: `/evaluate/${comparison.id}`,
      experiment_name: comparison.experiment?.name,
      experiment_created_at: comparison.experiment?.createdAt.toISOString()
    }))
    
    return NextResponse.json(comparisonList)
  } catch (error) {
    console.error('Error fetching comparisons:', error)
    return NextResponse.json({ error: 'Failed to fetch comparisons' }, { status: 500 })
  }
}