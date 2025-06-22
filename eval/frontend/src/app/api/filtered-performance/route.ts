import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { filters } = await request.json()
    
    // First, get participants that match the demographic filters
    const participants = await prisma.participant.findMany({
      include: {
        experiment: {
          select: {
            id: true,
            group: true
          }
        }
      }
    })

    // Filter participants based on demographics
    const filteredParticipants = participants.filter(participant => {
      const metadata = participant.metadata as any
      const demographics = metadata?.demographics
      
      if (!demographics) return false

      // Age filter
      if (demographics.age) {
        if (demographics.age < filters.ageMin || demographics.age > filters.ageMax) {
          return false
        }
      }

      // Sex filter
      if (filters.sex !== 'all' && demographics.sex !== filters.sex) {
        return false
      }

      // Country filter
      if (filters.country !== 'all' && demographics.country_of_residence !== filters.country) {
        return false
      }

      // Experiment group filter
      if (filters.experimentGroup !== 'all' && participant.experiment.group !== filters.experimentGroup) {
        return false
      }

      return true
    })

    // Get the experiment IDs from filtered participants
    const filteredExperimentIds = Array.from(new Set(filteredParticipants.map(p => p.experimentId)))
    
    if (filteredExperimentIds.length === 0) {
      return NextResponse.json([])
    }

    // Get evaluations from filtered participants only
    const evaluations = await prisma.evaluation.findMany({
      where: {
        participantId: { in: filteredParticipants.map(p => p.id) },
        status: 'completed',
        clientMetadata: {
          not: Prisma.JsonNull
        }
      },
      include: {
        comparison: {
          select: {
            modelA: true,
            modelB: true,
            scenarioId: true
          }
        }
      }
    })

    // Calculate performance metrics using clientMetadata.detailedRatings
    // Track by dimension and experiment since we're using clientMetadata structure
    const dimensionStatsMap: Record<string, {
      A_much_better: number;
      A_slightly_better: number;
      Equal: number;
      B_slightly_better: number;
      B_much_better: number;
      total: number;
      modelA: string;
      modelB: string;
      experimentId: string;
    }> = {}

    for (const evaluation of evaluations) {
      const modelA = evaluation.comparison.modelA
      const modelB = evaluation.comparison.modelB
      const clientMetadata = evaluation.clientMetadata as any

      if (!clientMetadata || typeof clientMetadata !== 'object') continue
      
      const detailedRatings = clientMetadata.detailedRatings
      if (!detailedRatings || typeof detailedRatings !== 'object') continue

      // Process each dimension in the detailedRatings
      for (const [dimension, score] of Object.entries(detailedRatings)) {
        if (typeof score !== 'string') continue
        
        // Create unique key combining dimension and experiment
        const dimensionKey = `${dimension}_${evaluation.experimentId}`
        
        // Initialize dimension tracking
        if (!dimensionStatsMap[dimensionKey]) {
          dimensionStatsMap[dimensionKey] = {
            A_much_better: 0, A_slightly_better: 0, Equal: 0, 
            B_slightly_better: 0, B_much_better: 0, total: 0,
            modelA: modelA,
            modelB: modelB,
            experimentId: evaluation.experimentId
          }
        }

        // Map score format to detailed format
        let mappedScore: keyof typeof dimensionStatsMap[string] | null = null
        switch (score) {
          case 'A_much_better':
          case 'A_Much_Better':
            mappedScore = 'A_much_better'
            break
          case 'A_slightly_better':
          case 'A_Slightly_Better':
          case 'A':
            mappedScore = 'A_slightly_better'
            break
          case 'Equal':
          case 'equal':
            mappedScore = 'Equal'
            break
          case 'B_slightly_better':
          case 'B_Slightly_Better':
          case 'B':
            mappedScore = 'B_slightly_better'
            break
          case 'B_much_better':
          case 'B_Much_Better':
            mappedScore = 'B_much_better'
            break
        }

        // Count the score (each evaluation counts once per dimension)
        if (mappedScore && mappedScore in dimensionStatsMap[dimensionKey]) {
          dimensionStatsMap[dimensionKey][mappedScore]++
          dimensionStatsMap[dimensionKey].total++
        }
      }
    }

    // Convert to the expected format with detailed scores
    const performance = []
    for (const [dimensionKey, stats] of Object.entries(dimensionStatsMap)) {
      if (stats.total > 0) {
        // Extract the actual dimension name (before the underscore and experiment ID)
        const dimension = dimensionKey.split('_').slice(0, -1).join('_')
        
        // Create entries for both models
        const modelAWins = stats.A_much_better + stats.A_slightly_better
        const modelBWins = stats.B_much_better + stats.B_slightly_better
        
        // Model A performance
        performance.push({
          model: stats.modelA,
          dimension: dimension,
          scenario: undefined, // No scenario since we're using clientMetadata structure
          win_rate: modelAWins / stats.total,
          num_evaluations: stats.total,
          experimentId: stats.experimentId,
          detailed_scores: {
            A_much_better: stats.A_much_better,
            A_slightly_better: stats.A_slightly_better,
            Equal: stats.Equal,
            B_slightly_better: stats.B_slightly_better,
            B_much_better: stats.B_much_better
          }
        })
        
        // Model B performance
        performance.push({
          model: stats.modelB,
          dimension: dimension,
          scenario: undefined, // No scenario since we're using clientMetadata structure
          win_rate: modelBWins / stats.total,
          num_evaluations: stats.total,
          experimentId: stats.experimentId,
          detailed_scores: {
            A_much_better: stats.A_much_better,
            A_slightly_better: stats.A_slightly_better,
            Equal: stats.Equal,
            B_slightly_better: stats.B_slightly_better,
            B_much_better: stats.B_much_better
          }
        })
      }
    }

    return NextResponse.json(performance)
  } catch (error) {
    console.error('Error fetching filtered performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filtered performance data' },
      { status: 500 }
    )
  }
}