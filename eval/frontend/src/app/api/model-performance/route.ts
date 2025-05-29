import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface ModelPerformance {
  model: string
  dimension: string
  win_rate: number
  num_evaluations: number
}

export async function GET() {
  try {
    // Get all evaluations with their comparison data
    const evaluations = await prisma.evaluation.findMany({
      include: {
        comparison: true
      }
    })

    // Calculate model performance by dimension
    const modelStats: Record<string, Record<string, { wins: number; total: number }>> = {}

    for (const evaluation of evaluations) {
      const dimensionScores = evaluation.dimensionScores as Record<string, string>
      const { modelA, modelB } = evaluation.comparison

      // Initialize model stats if needed
      if (!modelStats[modelA]) modelStats[modelA] = {}
      if (!modelStats[modelB]) modelStats[modelB] = {}

      // Process each dimension score
      for (const [dimension, choice] of Object.entries(dimensionScores)) {
        if (!modelStats[modelA][dimension]) {
          modelStats[modelA][dimension] = { wins: 0, total: 0 }
        }
        if (!modelStats[modelB][dimension]) {
          modelStats[modelB][dimension] = { wins: 0, total: 0 }
        }

        // Count wins based on chosen model (A or B)
        if (choice === 'A') {
          modelStats[modelA][dimension].wins += 1
          modelStats[modelA][dimension].total += 1
          modelStats[modelB][dimension].total += 1
        } else if (choice === 'B') {
          modelStats[modelB][dimension].wins += 1
          modelStats[modelA][dimension].total += 1
          modelStats[modelB][dimension].total += 1
        } else if (choice === 'tie') {
          // Count ties as 0.5 wins for both models
          modelStats[modelA][dimension].wins += 0.5
          modelStats[modelB][dimension].wins += 0.5
          modelStats[modelA][dimension].total += 1
          modelStats[modelB][dimension].total += 1
        }
      }
    }

    // Convert to performance array
    const performance: ModelPerformance[] = []
    
    for (const [model, dimensions] of Object.entries(modelStats)) {
      for (const [dimension, stats] of Object.entries(dimensions)) {
        if (stats.total > 0) {
          performance.push({
            model,
            dimension,
            win_rate: stats.wins / stats.total,
            num_evaluations: stats.total
          })
        }
      }
    }
    
    return NextResponse.json(performance)
  } catch (error) {
    console.error('Error calculating performance:', error)
    return NextResponse.json([])
  }
}