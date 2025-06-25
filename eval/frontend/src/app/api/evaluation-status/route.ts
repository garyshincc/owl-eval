import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get evaluation counts by status (excluding anonymous participants)
    const [completed, draft, total] = await Promise.all([
      prisma.evaluation.count({
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
      }),
      prisma.evaluation.count({
        where: { 
          status: 'draft',
          participant: {
            id: {
              not: {
                startsWith: 'anon-session-'
              }
            }
          }
        }
      }),
      prisma.evaluation.count({
        where: {
          participant: {
            id: {
              not: {
                startsWith: 'anon-session-'
              }
            }
          }
        }
      })
    ])

    return NextResponse.json({
      completed,
      draft,
      total,
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