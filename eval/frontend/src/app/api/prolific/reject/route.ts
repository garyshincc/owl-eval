import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { participantId, reason } = await request.json()

    if (!participantId || !reason) {
      return NextResponse.json(
        { error: 'Participant ID and reason are required' },
        { status: 400 }
      )
    }

    // Find the participant
    const participant = await prisma.participant.findUnique({
      where: { sessionId: participantId },
      include: { experiment: true }
    }) as any // Cast to any to handle schema changes not yet migrated

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    if (!participant.prolificId) {
      return NextResponse.json(
        { error: 'Not a Prolific participant' },
        { status: 400 }
      )
    }

    // Update participant status to rejected
    await prisma.participant.update({
      where: { sessionId: participantId },
      data: {
        status: 'screening_failed',
        rejectionReason: reason,
        rejectedAt: new Date()
      } as any // Cast to any to handle schema changes not yet migrated
    })

    // Make API call to Prolific to reject the submission
    const prolificApiKey = process.env.PROLIFIC_API_KEY
    
    if (!prolificApiKey) {
      console.error('PROLIFIC_API_KEY environment variable not set')
      return NextResponse.json(
        { 
          success: true, 
          message: 'Participant marked as rejected locally, but Prolific API key not configured',
          prolificApiCalled: false
        }
      )
    }

    if (!participant.prolificSubmissionId) {
      console.error(`No prolificSubmissionId found for participant ${participant.prolificId}`)
      return NextResponse.json(
        { 
          success: true, 
          message: 'Participant marked as rejected locally, but no submission ID found',
          prolificApiCalled: false
        }
      )
    }

    try {
      console.log(`Attempting to reject Prolific submission ${participant.prolificSubmissionId} for participant ${participant.prolificId}`)
      
      const prolificResponse = await fetch(
        `https://api.prolific.com/api/v1/submissions/${participant.prolificSubmissionId}/transition/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${prolificApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'REJECT',
            reason: reason
          })
        }
      )

      if (!prolificResponse.ok) {
        const errorText = await prolificResponse.text()
        console.error('Prolific API rejection failed:', {
          status: prolificResponse.status,
          statusText: prolificResponse.statusText,
          body: errorText
        })
        
        // Still return success since participant is marked as rejected locally
        return NextResponse.json({
          success: true,
          message: 'Participant rejected locally, but Prolific API call failed',
          prolificApiCalled: false,
          prolificError: `${prolificResponse.status}: ${errorText}`
        })
      }

      const responseData = await prolificResponse.json()
      console.log('Prolific rejection successful:', responseData)

      return NextResponse.json({
        success: true,
        message: 'Participant rejected successfully via Prolific API',
        prolificApiCalled: true,
        prolificResponse: responseData
      })

    } catch (error) {
      console.error('Error calling Prolific API:', error)
      
      // Still return success since participant is marked as rejected locally
      return NextResponse.json({
        success: true,
        message: 'Participant rejected locally, but Prolific API call failed',
        prolificApiCalled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Error rejecting participant:', error)
    return NextResponse.json(
      { error: 'Failed to reject participant' },
      { status: 500 }
    )
  }
}