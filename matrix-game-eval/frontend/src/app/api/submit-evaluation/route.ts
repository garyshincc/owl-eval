import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.comparison_id || !data.dimension_scores) {
      return NextResponse.json({ 
        error: 'Missing required fields: comparison_id and dimension_scores' 
      }, { status: 400 })
    }
    
    // Determine the chosen model based on dimension scores
    let chosenModel = 'Equal'
    const scores = Object.values(data.dimension_scores) as string[]
    const aCount = scores.filter(s => s === 'A').length
    const bCount = scores.filter(s => s === 'B').length
    
    if (aCount > bCount) {
      chosenModel = 'A'
    } else if (bCount > aCount) {
      chosenModel = 'B'
    }
    
    // Create evaluation record in database
    const evaluation = await prisma.evaluation.create({
      data: {
        comparisonId: data.comparison_id,
        participantId: data.participant_id || null,
        experimentId: data.experiment_id || null,
        chosenModel: chosenModel,
        dimensionScores: data.dimension_scores,
        completionTimeSeconds: data.completion_time_seconds || null,
        clientMetadata: {
          evaluatorId: data.evaluator_id || 'anonymous',
          detailedRatings: data.detailed_ratings || {},
          submittedAt: new Date().toISOString()
        }
      }
    })
    
    // If this is a Prolific participant, check if they've completed all assigned comparisons
    if (data.participant_id) {
      const participant = await prisma.participant.findUnique({
        where: { id: data.participant_id },
        include: {
          evaluations: true
        }
      })
      
      if (participant) {
        const assignedComparisons = participant.assignedComparisons as string[]
        const completedComparisons = participant.evaluations.map(e => e.comparisonId)
        
        // Check if all assigned comparisons are completed
        const allCompleted = assignedComparisons.every(compId => 
          completedComparisons.includes(compId)
        )
        
        if (allCompleted && participant.status !== 'completed') {
          await prisma.participant.update({
            where: { id: data.participant_id },
            data: {
              status: 'completed',
              completedAt: new Date()
            }
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      evaluation_id: evaluation.id
    })
  } catch (error) {
    console.error('Error submitting evaluation:', error)
    return NextResponse.json({ 
      error: 'Failed to submit evaluation' 
    }, { status: 500 })
  }
}