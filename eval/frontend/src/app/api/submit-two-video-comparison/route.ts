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

    // Get the comparison to extract the experimentId
    const comparison = await prisma.twoVideoComparisonTask.findUnique({
      where: { id: data.comparison_id },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: 'Comparison not found' },
        { status: 404 }
      );
    }

    const actualExperimentId = data.experiment_id || comparison.experimentId;

    // Handle anonymous users - use consistent participant ID per session
    let actualParticipantId = data.participant_id;
    
    if (!data.participant_id || data.participant_id === 'anonymous') {
      // Generate session-based participant ID for anonymous users (without comparison ID)
      const sessionId = data.session_id || 'anon-session';
      actualParticipantId = `anon-${sessionId}`;
      
      // Check if we need to create an anonymous participant record
      const existingParticipant = await prisma.participant.findUnique({
        where: { id: actualParticipantId },
      });
      
      if (!existingParticipant) {
        // Get all comparisons for this experiment to assign them all
        const allComparisons = await prisma.twoVideoComparisonTask.findMany({
          where: { experimentId: actualExperimentId },
          select: { id: true }
        });
        
        // Create an anonymous participant record with all comparisons assigned
        const uniqueProlificId = data.evaluator_id === 'anonymous' 
          ? `anon-${actualParticipantId}` 
          : data.evaluator_id || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
        try {
          await prisma.participant.create({
            data: {
              id: actualParticipantId,
              prolificId: uniqueProlificId,
              experimentId: actualExperimentId,
              sessionId: sessionId,
              status: 'active',
              assignedTwoVideoComparisonTasks: allComparisons.map(c => c.id),
              assignedSingleVideoEvaluationTasks: [], // Empty for comparison mode
            },
          });
        } catch (error) {
          // If participant creation fails due to constraint violation, 
          // it might already exist - continue with evaluation
          console.log('Participant creation failed (likely already exists):', error);
        }
      }
    }

    // Check if there's already a completed evaluation for this participant/comparison
    const existingCompleteEvaluation = await prisma.twoVideoComparisonSubmission.findUnique({
      where: {
        twoVideoComparisonTaskId_participantId: {
          twoVideoComparisonTaskId: data.comparison_id,
          participantId: actualParticipantId,
        },
      },
    });

    // If there's already a completed evaluation, prevent duplicate submission
    if (existingCompleteEvaluation && existingCompleteEvaluation.status === 'completed') {
      return NextResponse.json(
        { error: 'Evaluation already completed for this participant' },
        { status: 409 }
      );
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
    
    // Update existing draft or create new evaluation
    const evaluation = await prisma.twoVideoComparisonSubmission.upsert({
      where: {
        twoVideoComparisonTaskId_participantId: {
          twoVideoComparisonTaskId: data.comparison_id,
          participantId: actualParticipantId
        }
      },
      update: {
        chosenModel: chosenModel,
        dimensionScores: data.dimension_scores,
        completionTimeSeconds: data.completion_time_seconds || null,
        clientMetadata: {
          evaluatorId: data.evaluator_id || 'anonymous',
          detailedRatings: data.detailed_ratings || {},
          submittedAt: new Date().toISOString()
        },
        status: 'completed',
        lastSavedAt: new Date()
      },
      create: {
        twoVideoComparisonTaskId: data.comparison_id,
        participantId: actualParticipantId,
        experimentId: actualExperimentId,
        chosenModel: chosenModel,
        dimensionScores: data.dimension_scores,
        completionTimeSeconds: data.completion_time_seconds || null,
        clientMetadata: {
          evaluatorId: data.evaluator_id || 'anonymous',
          detailedRatings: data.detailed_ratings || {},
          submittedAt: new Date().toISOString()
        },
        status: 'completed'
      }
    })
    
    // If this is a Prolific participant, check if they've completed all assigned comparisons
    if (data.participant_id) {
      const participant = await prisma.participant.findUnique({
        where: { id: data.participant_id },
        include: {
          twoVideoComparisonSubmissions: true
        }
      })
      
      if (participant) {
        const assignedComparisons = participant.assignedTwoVideoComparisonTasks as string[]
        const completedComparisons = participant.twoVideoComparisonSubmissions.map(e => e.twoVideoComparisonTaskId)
        
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
    
    // Check if there are more comparisons available in this experiment
    let nextComparison = null;
    
    // Get all comparisons in this experiment
    const allComparisons = await prisma.twoVideoComparisonTask.findMany({
      where: { 
        experimentId: actualExperimentId
      },
      orderBy: { createdAt: 'asc' }
    });

    // Find comparisons that haven't been evaluated by this user
    for (const comp of allComparisons) {
      const existingEval = await prisma.twoVideoComparisonSubmission.findUnique({
        where: {
          twoVideoComparisonTaskId_participantId: {
            twoVideoComparisonTaskId: comp.id,
            participantId: actualParticipantId
          }
        }
      });
      
      if (!existingEval || existingEval.status !== 'completed') {
        nextComparison = comp.id;
        break;
      }
    }
    
    return NextResponse.json({
      success: true,
      evaluation_id: evaluation.id,
      next_comparison_id: nextComparison
    })
  } catch (error) {
    console.error('Error submitting evaluation:', error)
    return NextResponse.json({ 
      error: 'Failed to submit evaluation' 
    }, { status: 500 })
  }
}