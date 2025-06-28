import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')
    const experimentId = searchParams.get('experimentId')

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // If experimentId is provided, find tasks for that specific experiment
    // Otherwise, find tasks across all active experiments
    let whereClause: any = {}
    if (experimentId) {
      whereClause.experimentId = experimentId
    } else {
      whereClause.experiment = {
        status: { in: ['active', 'ready'] },
        archived: false
      }
    }

    // First check for available comparison tasks
    const comparisonTasks = await prisma.twoVideoComparisonTask.findMany({
      where: whereClause,
      include: {
        experiment: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Find first comparison task that user hasn't completed
    for (const task of comparisonTasks) {
      const existingSubmission = await prisma.twoVideoComparisonSubmission.findUnique({
        where: {
          twoVideoComparisonTaskId_participantId: {
            twoVideoComparisonTaskId: task.id,
            participantId: participantId
          }
        }
      })

      if (!existingSubmission || existingSubmission.status !== 'completed') {
        return NextResponse.json({
          taskId: task.id,
          taskType: 'comparison',
          evaluationMode: 'comparison',
          experimentId: task.experimentId,
          experimentName: task.experiment.name
        })
      }
    }

    // If no comparison tasks available, check single video tasks
    const singleVideoTasks = await prisma.singleVideoEvaluationTask.findMany({
      where: whereClause,
      include: {
        experiment: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Find first single video task that user hasn't completed
    for (const task of singleVideoTasks) {
      const existingSubmission = await prisma.singleVideoEvaluationSubmission.findUnique({
        where: {
          singleVideoEvaluationTaskId_participantId: {
            singleVideoEvaluationTaskId: task.id,
            participantId: participantId
          }
        }
      })

      if (!existingSubmission || existingSubmission.status !== 'completed') {
        return NextResponse.json({
          taskId: task.id,
          taskType: 'single_video',
          evaluationMode: 'single_video',
          experimentId: task.experimentId,
          experimentName: task.experiment.name
        })
      }
    }

    // No tasks available
    return NextResponse.json({
      taskId: null,
      message: 'No tasks available'
    })

  } catch (error) {
    console.error('Error fetching next task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next task' },
      { status: 500 }
    )
  }
}