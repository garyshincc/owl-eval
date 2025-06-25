import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        archived: true,
        archivedAt: true,
        group: true,
        prolificStudyId: true,
        evaluationMode: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        completedAt: true,
        _count: {
          select: {
            comparisons: true,
            participants: {
              where: {
                AND: [
                  {
                    id: {
                      not: {
                        startsWith: 'anon-session-'
                      }
                    }
                  },
                  {
                    status: {
                      not: 'returned'  // Always exclude returned participants
                    }
                  }
                ]
              }
            },
            evaluations: {
              where: {
                status: 'completed',
                participant: {
                  AND: [
                    {
                      id: {
                        not: {
                          startsWith: 'anon-session-'
                        }
                      }
                    },
                    {
                      status: {
                        not: 'returned'  // Always exclude returned participants
                      }
                    }
                  ]
                }
              }
            },
          }
        }
      }
    });
    
    return NextResponse.json(experiments);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { name, description, slug, group, comparisons, evaluationMode = 'comparison', demographics } = await request.json();

    if (!name || !comparisons || !Array.isArray(comparisons)) {
      return NextResponse.json(
        { error: 'Name and comparisons are required' },
        { status: 400 }
      );
    }

    // Validate that all comparisons have required fields based on evaluation mode
    for (const comp of comparisons) {
      if (!comp.scenarioId || !comp.modelA || !comp.videoAUrl) {
        return NextResponse.json(
          { error: 'All tasks must have scenarioId, modelA, and videoAUrl' },
          { status: 400 }
        );
      }
      
      // Additional validation for comparison mode
      if (evaluationMode === 'comparison') {
        if (!comp.modelB || !comp.videoBUrl) {
          return NextResponse.json(
            { error: 'Comparison mode requires modelB and videoBUrl for all comparisons' },
            { status: 400 }
          );
        }
      }
    }

    // Create experiment with either comparisons or video tasks based on evaluation mode
    const experimentData: any = {
      name,
      description: description || null,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      group: group || null,
      status: 'draft',
      evaluationMode: evaluationMode,
      config: {
        models: evaluationMode === 'comparison' 
          ? Array.from(new Set([...comparisons.map(c => c.modelA), ...comparisons.map(c => c.modelB)]))
          : Array.from(new Set(comparisons.map(c => c.modelA))),
        scenarios: Array.from(new Set(comparisons.map(c => c.scenarioId))),
        demographics: demographics || null
      },
      createdBy: authResult.user?.id || null,
    }

    if (evaluationMode === 'single_video') {
      // Create video tasks for single video evaluation
      experimentData.videoTasks = {
        create: comparisons.map(comp => ({
          scenarioId: comp.scenarioId,
          modelName: comp.modelA,
          videoPath: comp.videoAUrl,
          metadata: comp.metadata || {}
        }))
      }
    } else {
      // Create comparisons for comparison evaluation
      experimentData.comparisons = {
        create: comparisons.map(comp => ({
          scenarioId: comp.scenarioId,
          modelA: comp.modelA,
          modelB: comp.modelB,
          videoAPath: comp.videoAUrl,
          videoBPath: comp.videoBUrl,
          metadata: comp.metadata || {}
        }))
      }
    }

    const experiment = await prisma.experiment.create({
      data: experimentData,
      include: {
        comparisons: true,
        videoTasks: true,
        _count: {
          select: {
            comparisons: true,
            participants: {
              where: {
                AND: [
                  {
                    id: {
                      not: {
                        startsWith: 'anon-session-'
                      }
                    }
                  },
                  {
                    status: {
                      not: 'returned'  // Always exclude returned participants
                    }
                  }
                ]
              }
            },
            evaluations: {
              where: {
                status: 'completed',
                participant: {
                  AND: [
                    {
                      id: {
                        not: {
                          startsWith: 'anon-session-'
                        }
                      }
                    },
                    {
                      status: {
                        not: 'returned'  // Always exclude returned participants
                      }
                    }
                  ]
                }
              }
            },
          }
        }
      }
    });

    return NextResponse.json(experiment);
  } catch (error) {
    console.error('Error creating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}