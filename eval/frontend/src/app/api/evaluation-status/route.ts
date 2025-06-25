import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get filters from URL params
    const { searchParams } = new URL(request.url)
    const includeAnonymous = searchParams.get('includeAnonymous') === 'true'
    
    // Build participant filter based on anonymous inclusion
    const participantFilter = includeAnonymous ? {
      participant: {
        status: {
          not: 'returned'  // Always exclude returned participants
        }
      }
    } : {
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
    
    // Get evaluation counts by status for both evaluation types
    const [completed, draft, total, singleVideoCompleted, singleVideoDraft, singleVideoTotal] = await Promise.all([
      prisma.evaluation.count({
        where: { 
          status: 'completed',
          ...participantFilter
        }
      }),
      prisma.evaluation.count({
        where: { 
          status: 'draft',
          ...participantFilter
        }
      }),
      prisma.evaluation.count({
        where: participantFilter
      }),
      prisma.singleVideoEvaluation.count({
        where: { 
          status: 'completed',
          ...participantFilter
        }
      }),
      prisma.singleVideoEvaluation.count({
        where: { 
          status: 'draft',
          ...participantFilter
        }
      }),
      prisma.singleVideoEvaluation.count({
        where: participantFilter
      })
    ])

    return NextResponse.json({
      completed: completed + singleVideoCompleted,
      draft: draft + singleVideoDraft,
      total: total + singleVideoTotal,
      active: 0 // We don't track "active" evaluations, only draft and completed
    })
  } catch (error) {
    console.error('Error fetching evaluation status:', error)
    return NextResponse.json({
      completed: 0,
      draft: 0,
      total: 0,
      active: 0
    })
  }
}