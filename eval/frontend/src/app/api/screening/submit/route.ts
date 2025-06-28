import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateScreeningAnswers } from '@/lib/screening-config'

export async function POST(request: NextRequest) {
  try {
    const { participantId, evaluationMode, answers, validation, configVersion } = await request.json()

    if (!participantId || !evaluationMode || !answers || !validation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find participant
    const participant = await prisma.participant.findUnique({
      where: { sessionId: participantId },
      include: { experiment: true }
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Validate answers server-side to prevent tampering
    const serverValidation = validateScreeningAnswers(evaluationMode, answers)
    
    // Update participant with screening results
    const updatedParticipant = await prisma.participant.update({
      where: { sessionId: participantId },
      data: {
        screeningStatus: serverValidation.passed ? 'passed' : 'failed',
        screeningVersion: configVersion,
        screeningAttempts: { increment: 1 },
        screeningData: {
          answers,
          clientValidation: validation,
          serverValidation,
          submittedAt: new Date().toISOString(),
          evaluationMode
        },
        screeningCompletedAt: new Date(),
        // If they failed, mark their status as screening_failed
        status: serverValidation.passed ? participant.status : 'screening_failed'
      }
    })

    // If they failed screening, potentially reject them via Prolific
    if (!serverValidation.passed) {
      console.log(`Participant ${participant.prolificId} failed screening`)
      
      // Note: Prolific rejection could be implemented here if needed
      // For now, just log the failure
      
      return NextResponse.json({
        success: true,
        passed: false,
        validation: serverValidation,
        message: 'Screening failed'
      })
    }

    return NextResponse.json({
      success: true,
      passed: true,
      validation: serverValidation,
      message: 'Screening passed successfully'
    })

  } catch (error) {
    console.error('Error submitting screening:', error)
    return NextResponse.json(
      { error: 'Failed to submit screening' },
      { status: 500 }
    )
  }
}