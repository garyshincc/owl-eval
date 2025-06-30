import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.video_task_id || !data.dimension_scores) {
      return NextResponse.json({ 
        error: 'Missing required fields: video_task_id and dimension_scores' 
      }, { status: 400 })
    }

    // Get the video task to extract the experimentId
    const videoTask = await prisma.singleVideoEvaluationTask.findUnique({
      where: { id: data.video_task_id },
    });

    if (!videoTask) {
      return NextResponse.json(
        { error: 'Video task not found' },
        { status: 404 }
      );
    }

    const actualExperimentId = data.experiment_id || videoTask.experimentId;

    // Handle anonymous users - use consistent participant ID per session
    let actualParticipantId = data.participant_id;
    
    if (!data.participant_id || data.participant_id === 'anonymous') {
      // Generate session-based participant ID for anonymous users
      const sessionId = data.session_id || 'anon-session';
      actualParticipantId = `anon-${sessionId}`;
      
      // Check if we need to create an anonymous participant record
      const existingParticipant = await prisma.participant.findUnique({
        where: { id: actualParticipantId },
      });
      
      if (!existingParticipant) {
        // Get all video tasks for this experiment to assign them all
        const allVideoTasks = await prisma.singleVideoEvaluationTask.findMany({
          where: { experimentId: actualExperimentId },
          select: { id: true }
        });
        
        // Create an anonymous participant record with all video tasks assigned
        const uniqueProlificId = data.evaluator_id === 'anonymous' 
          ? `anon-${actualParticipantId}` 
          : data.evaluator_id || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
        try {
          console.log('Creating participant with:', {
            id: actualParticipantId,
            prolificId: uniqueProlificId,
            experimentId: actualExperimentId,
            sessionId: sessionId,
          });
          
          await prisma.participant.create({
            data: {
              id: actualParticipantId,
              prolificId: uniqueProlificId,
              experimentId: actualExperimentId,
              sessionId: sessionId,
              status: 'active',
              assignedTwoVideoComparisonTasks: [], // Empty for single video mode
              assignedSingleVideoEvaluationTasks: allVideoTasks.map(vt => vt.id),
            },
          });
          console.log('Participant created successfully:', actualParticipantId);
        } catch (error) {
          // If participant creation fails due to constraint violation, 
          // it might already exist - continue with evaluation
          console.error('Participant creation failed:', error);
          
          // Check if the participant actually exists
          const existingCheck = await prisma.participant.findUnique({
            where: { id: actualParticipantId },
          });
          
          if (!existingCheck) {
            console.error('Participant does not exist and creation failed');
            return NextResponse.json(
              { error: 'Failed to create participant. Check if experiment exists.' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Check if there's already a completed evaluation for this participant/video task
    const existingCompleteEvaluation = await prisma.singleVideoEvaluationSubmission.findUnique({
      where: {
        singleVideoEvaluationTaskId_participantId: {
          singleVideoEvaluationTaskId: data.video_task_id,
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
    
    // Update existing draft or create new evaluation
    const evaluation = await prisma.singleVideoEvaluationSubmission.upsert({
      where: {
        singleVideoEvaluationTaskId_participantId: {
          singleVideoEvaluationTaskId: data.video_task_id,
          participantId: actualParticipantId
        }
      },
      update: {
        dimensionScores: data.dimension_scores,
        completionTimeSeconds: data.completion_time_seconds || null,
        clientMetadata: {
          evaluatorId: data.evaluator_id || 'anonymous',
          submittedAt: new Date().toISOString()
        },
        status: 'completed',
        lastSavedAt: new Date()
      },
      create: {
        singleVideoEvaluationTaskId: data.video_task_id,
        participantId: actualParticipantId,
        experimentId: actualExperimentId,
        dimensionScores: data.dimension_scores,
        completionTimeSeconds: data.completion_time_seconds || null,
        clientMetadata: {
          evaluatorId: data.evaluator_id || 'anonymous',
          submittedAt: new Date().toISOString()
        },
        status: 'completed'
      }
    })
    
    // If this is a Prolific participant, check if they've completed all assigned video tasks
    if (data.participant_id) {
      const participant = await prisma.participant.findUnique({
        where: { id: data.participant_id },
        include: {
          singleVideoEvaluationSubmissions: true
        }
      })
      
      if (participant) {
        const assignedVideoTasks = participant.assignedSingleVideoEvaluationTasks as string[]
        const completedVideoTasks = participant.singleVideoEvaluationSubmissions
          .filter(e => e.status === 'completed')
          .map(e => e.singleVideoEvaluationTaskId)
        
        // Check if all assigned video tasks are completed
        const allCompleted = assignedVideoTasks.every(taskId => 
          completedVideoTasks.includes(taskId)
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
    
    // Check if there are more video tasks available in this experiment
    let nextVideoTask = null;
    
    // Get all video tasks in this experiment
    const allVideoTasks = await prisma.singleVideoEvaluationTask.findMany({
      where: { 
        experimentId: actualExperimentId
      },
      orderBy: { createdAt: 'asc' }
    });

    // Find video tasks that haven't been evaluated by this user
    for (const task of allVideoTasks) {
      const existingEval = await prisma.singleVideoEvaluationSubmission.findUnique({
        where: {
          singleVideoEvaluationTaskId_participantId: {
            singleVideoEvaluationTaskId: task.id,
            participantId: actualParticipantId
          }
        }
      });
      
      if (!existingEval || existingEval.status !== 'completed') {
        nextVideoTask = task.id;
        break;
      }
    }
    
    return NextResponse.json({
      success: true,
      evaluation_id: evaluation.id,
      next_video_task_id: nextVideoTask
    })
  } catch (error) {
    console.error('Error submitting single video evaluation:', error)
    return NextResponse.json({ 
      error: 'Failed to submit evaluation' 
    }, { status: 500 })
  }
}