import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prolificPid, studyId, sessionId } = body

    // Validate required parameters
    if (!prolificPid || !studyId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Validate Prolific ID format (24 characters, only lowercase letters a-f and numbers)
    const prolificIdRegex = /^[a-f0-9]{24}$/
    if (!prolificIdRegex.test(prolificPid) || !prolificIdRegex.test(studyId) || !prolificIdRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid parameter format' },
        { status: 400 }
      )
    }

    // Find the experiment by Prolific study ID
    const experiment = await prisma.experiment.findUnique({
      where: { prolificStudyId: studyId },
      include: { 
        twoVideoComparisonTasks: true,
        singleVideoEvaluationTasks: true 
      }
    })

    if (!experiment) {
      return NextResponse.json(
        { error: 'Study not found' },
        { status: 404 }
      )
    }

    // Check if experiment is active
    if (experiment.status !== 'active') {
      return NextResponse.json(
        { error: 'Study is not active' },
        { status: 403 }
      )
    }

    // Check if participant already exists for this experiment
    let participant = await prisma.participant.findFirst({
      where: {
        prolificId: prolificPid,
        experimentId: experiment.id
      }
    })
    
    if (participant) {
      // Update existing participant for this experiment
      participant = await prisma.participant.update({
        where: { id: participant.id },
        data: {
          sessionId: sessionId,
          prolificSubmissionId: sessionId, // sessionId from Prolific is actually the submission ID
          status: 'active',
          metadata: {
            ...participant.metadata as object || {},
            lastAccessed: new Date().toISOString(),
            studyId: studyId
          }
        }
      })
    } else {
      // Create new participant for this experiment
      const evaluationMode = (experiment as any).evaluationMode || 'comparison'
      
      participant = await prisma.participant.create({
        data: {
          prolificId: prolificPid,
          prolificSubmissionId: sessionId, // sessionId from Prolific is actually the submission ID
          experimentId: experiment.id,
          sessionId: sessionId,
          status: 'active',
          assignedTwoVideoComparisonTasks: evaluationMode === 'comparison' ? experiment.twoVideoComparisonTasks.map(c => c.id) : [],
          assignedSingleVideoEvaluationTasks: evaluationMode === 'single_video' ? experiment.singleVideoEvaluationTasks.map(vt => vt.id) : [],
          metadata: {
            studyId: studyId,
            firstAccessed: new Date().toISOString()
          }
        }
      })
    }

    // Set the study's completion code if not exists
    if (!participant.completionCode) {
      // Get the completion code from the experiment config
      const experimentConfig = experiment.config as any;
      const completionCode = experimentConfig?.prolificCompletionCode || generateCompletionCode()
      
      await prisma.participant.update({
        where: { id: participant.id },
        data: { completionCode }
      })
      participant.completionCode = completionCode
    }

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      experimentId: experiment.id,
      completionCode: participant.completionCode
    })
  } catch (error) {
    console.error('Error creating Prolific session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCompletionCode(): string {
  // Generate a random 8-character alphanumeric code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}