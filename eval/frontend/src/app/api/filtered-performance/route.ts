import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { filters, selectedExperiment } = await request.json()
    
    // First, get participants that match the demographic filters
    const participants = await prisma.participant.findMany({
      include: {
        experiment: {
          select: {
            id: true,
            group: true,
            evaluationMode: true
          }
        }
      }
    })

    // Get all experiments to filter by group if needed
    let validExperimentIds: string[] = []
    if (filters.experimentGroup && filters.experimentGroup !== 'all' && filters.experimentGroup !== '') {
      const groupExperiments = await prisma.experiment.findMany({
        where: { group: filters.experimentGroup },
        select: { id: true }
      })
      validExperimentIds = groupExperiments.map(exp => exp.id)
    }

    // Filter participants based on demographics and experiment group
    const filteredParticipants = participants.filter(participant => {
      const metadata = participant.metadata as any
      const demographics = metadata?.demographics
      
      if (!demographics) return false

      // Experiment group filter
      if (validExperimentIds.length > 0 && !validExperimentIds.includes(participant.experimentId)) {
        return false
      }

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

      return true
    })

    // Further filter by specific experiment if provided
    const finalFilteredParticipants = selectedExperiment 
      ? filteredParticipants.filter(p => p.experimentId === selectedExperiment)
      : filteredParticipants


    // Get the experiment IDs from filtered participants
    const filteredExperimentIds = Array.from(new Set(finalFilteredParticipants.map(p => p.experimentId)))
    
    if (filteredExperimentIds.length === 0) {
      return NextResponse.json([])
    }

    // Get experiment details to determine evaluation modes
    const experimentIds = Array.from(new Set(finalFilteredParticipants.map(p => p.experimentId)))
    const experiments = await prisma.experiment.findMany({
      where: { id: { in: experimentIds } }
    })
    
    const evaluationModes = Array.from(new Set(
      experiments.map(exp => (exp as any).evaluationMode || 'comparison')
    ))

    const performance = []

    // Handle Comparison Evaluations (A vs B)
    if (evaluationModes.includes('comparison')) {
      // Build evaluation query - if specific experiment selected, filter by experiment directly
      let evaluationWhere: any = {
        status: 'completed',
        clientMetadata: {
          not: Prisma.JsonNull
        }
      }

      if (selectedExperiment) {
        // If specific experiment selected, filter by experiment through comparison
        evaluationWhere.comparison = {
          experimentId: selectedExperiment
        }
      } else {
        // Otherwise filter by participant IDs as before
        evaluationWhere.participantId = { in: finalFilteredParticipants.map(p => p.id) }
      }

      const comparisonEvaluations = await prisma.evaluation.findMany({
        where: evaluationWhere,
        include: {
          comparison: {
            select: {
              modelA: true,
              modelB: true,
              scenarioId: true,
              experimentId: true
            }
          },
          participant: {
            select: {
              id: true,
              experimentId: true,
              metadata: true
            }
          }
        }
      })


      // Process comparison evaluations
      const comparisonStatsMap: Record<string, {
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

      for (const evaluation of comparisonEvaluations) {
        // If we queried by experiment directly, we need to apply demographic filters here
        if (selectedExperiment && evaluation.participant) {
          const participantMetadata = evaluation.participant.metadata as any
          const demographics = participantMetadata?.demographics
          
          // Apply demographic filters
          if (demographics) {
            // Age filter
            if (demographics.age && (demographics.age < filters.ageMin || demographics.age > filters.ageMax)) {
              continue
            }
            // Sex filter
            if (filters.sex !== 'all' && demographics.sex !== filters.sex) {
              continue
            }
            // Country filter
            if (filters.country !== 'all' && demographics.country_of_residence !== filters.country) {
              continue
            }
          } else if (filters.sex !== 'all' || filters.country !== 'all') {
            // If demographic filters are set but participant has no demographics, skip
            continue
          }
        }

        const modelA = evaluation.comparison.modelA
        const modelB = evaluation.comparison.modelB
        const clientMetadata = evaluation.clientMetadata as any

        if (!clientMetadata || typeof clientMetadata !== 'object') continue
        
        const detailedRatings = clientMetadata.detailedRatings
        if (!detailedRatings || typeof detailedRatings !== 'object') continue

        // Process each dimension in the detailedRatings
        for (const [dimension, score] of Object.entries(detailedRatings)) {
          if (typeof score !== 'string') continue
          
          // Use comparison.experimentId instead of evaluation.experimentId
          const experimentId = evaluation.comparison.experimentId
          const dimensionKey = `${dimension}_${experimentId}`
          
          if (!comparisonStatsMap[dimensionKey]) {
            comparisonStatsMap[dimensionKey] = {
              A_much_better: 0, A_slightly_better: 0, Equal: 0, 
              B_slightly_better: 0, B_much_better: 0, total: 0,
              modelA: modelA,
              modelB: modelB,
              experimentId: experimentId
            }
          }

          // Map score to detailed format
          let mappedScore: keyof typeof comparisonStatsMap[string] | null = null
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

          if (mappedScore && mappedScore in comparisonStatsMap[dimensionKey]) {
            comparisonStatsMap[dimensionKey][mappedScore]++
            comparisonStatsMap[dimensionKey].total++
          }
        }
      }

      // Convert comparison stats to performance format
      for (const [dimensionKey, stats] of Object.entries(comparisonStatsMap)) {
        if (stats.total > 0) {
          const dimension = dimensionKey.split('_').slice(0, -1).join('_')
          const modelAWins = stats.A_much_better + stats.A_slightly_better
          const modelBWins = stats.B_much_better + stats.B_slightly_better
          const ties = stats.Equal
          
          // Calculate win rate including ties as 50% (wins + 0.5 * ties) / total
          const modelAWinRate = (modelAWins + 0.5 * ties) / stats.total
          const modelBWinRate = (modelBWins + 0.5 * ties) / stats.total
          
          // Model A performance - from Model A's perspective
          performance.push({
            model: stats.modelA,
            dimension: dimension,
            scenario: undefined,
            win_rate: modelAWinRate,
            num_evaluations: stats.total,
            experimentId: stats.experimentId,
            evaluationType: 'comparison',
            detailed_scores: {
              A_much_better: stats.A_much_better,
              A_slightly_better: stats.A_slightly_better,
              Equal: stats.Equal,
              B_slightly_better: stats.B_slightly_better,
              B_much_better: stats.B_much_better
            }
          })
          
          // Model B performance - from Model B's perspective (flipped scores)
          performance.push({
            model: stats.modelB,
            dimension: dimension,
            scenario: undefined,
            win_rate: modelBWinRate,
            num_evaluations: stats.total,
            experimentId: stats.experimentId,
            evaluationType: 'comparison',
            detailed_scores: {
              A_much_better: stats.B_much_better,
              A_slightly_better: stats.B_slightly_better,
              Equal: stats.Equal,
              B_slightly_better: stats.A_slightly_better,
              B_much_better: stats.A_much_better
            }
          })
        }
      }
    }

    // Handle Single Video Evaluations
    if (evaluationModes.includes('single_video')) {
      // Build single video evaluation query
      let singleVideoWhere: any = {
        status: 'completed'
      }

      if (selectedExperiment) {
        // If specific experiment selected, filter by experiment directly
        singleVideoWhere.experimentId = selectedExperiment
      } else {
        // Otherwise filter by participant IDs as before
        singleVideoWhere.participantId = { in: finalFilteredParticipants.map(p => p.id) }
      }

      const singleVideoEvaluations = await (prisma as any).singleVideoEvaluation.findMany({
        where: singleVideoWhere,
        include: {
          videoTask: {
            select: {
              modelName: true,
              scenarioId: true
            }
          },
          participant: selectedExperiment ? {
            select: {
              id: true,
              experimentId: true,
              metadata: true
            }
          } : undefined
        }
      })


      // Process single video evaluations
      const singleVideoStatsMap: Record<string, {
        totalScore: number;
        count: number;
        scores: number[];
        modelName: string;
        experimentId: string;
      }> = {}

      for (const evaluation of singleVideoEvaluations) {
        // If we queried by experiment directly, we need to apply demographic filters here
        if (selectedExperiment && evaluation.participant) {
          const participantMetadata = evaluation.participant.metadata as any
          const demographics = participantMetadata?.demographics
          
          // Apply demographic filters
          if (demographics) {
            // Age filter
            if (demographics.age && (demographics.age < filters.ageMin || demographics.age > filters.ageMax)) {
              continue
            }
            // Sex filter
            if (filters.sex !== 'all' && demographics.sex !== filters.sex) {
              continue
            }
            // Country filter
            if (filters.country !== 'all' && demographics.country_of_residence !== filters.country) {
              continue
            }
          } else if (filters.sex !== 'all' || filters.country !== 'all' || demographics?.age) {
            // If demographic filters are set but participant has no demographics, skip
            continue
          }
        }

        const modelName = evaluation.videoTask.modelName
        const dimensionScores = evaluation.dimensionScores as any

        if (!dimensionScores || typeof dimensionScores !== 'object') continue

        // Process each dimension score (1-5 scale)
        for (const [dimension, score] of Object.entries(dimensionScores)) {
          if (typeof score !== 'number' || score < 1 || score > 5) continue
          
          // Use the actual experiment ID - check if it's directly on evaluation or needs to be passed differently
          const experimentId = selectedExperiment || evaluation.experimentId
          const dimensionKey = `${dimension}_${experimentId}_${modelName}`
          
          if (!singleVideoStatsMap[dimensionKey]) {
            singleVideoStatsMap[dimensionKey] = {
              totalScore: 0,
              count: 0,
              scores: [],
              modelName: modelName,
              experimentId: experimentId
            }
          }

          singleVideoStatsMap[dimensionKey].totalScore += score
          singleVideoStatsMap[dimensionKey].count++
          singleVideoStatsMap[dimensionKey].scores.push(score)
        }
      }

      // Convert single video stats to performance format
      for (const [dimensionKey, stats] of Object.entries(singleVideoStatsMap)) {
        if (stats.count > 0) {
          const keyParts = dimensionKey.split('_')
          const dimension = keyParts.slice(0, -2).join('_') // Remove experimentId and modelName
          const averageScore = stats.totalScore / stats.count
          
          // Convert 1-5 scale to 0-1 "quality score" (4-5 considered good)
          const qualityRate = stats.scores.filter(s => s >= 4).length / stats.scores.length
          
          performance.push({
            model: stats.modelName,
            dimension: dimension,
            scenario: undefined,
            win_rate: qualityRate, // For single video, "win rate" = proportion of high scores
            quality_score: averageScore, // Average 1-5 rating
            num_evaluations: stats.count,
            experimentId: stats.experimentId,
            evaluationType: 'single_video',
            score_distribution: {
              1: stats.scores.filter(s => s === 1).length,
              2: stats.scores.filter(s => s === 2).length,
              3: stats.scores.filter(s => s === 3).length,
              4: stats.scores.filter(s => s === 4).length,
              5: stats.scores.filter(s => s === 5).length
            }
          })
        }
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