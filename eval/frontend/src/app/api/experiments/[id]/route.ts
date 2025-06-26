import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        comparisons: true,
        _count: {
          select: {
            comparisons: true,
            participants: {
              where: {
                id: {
                  not: {
                    startsWith: 'anon-session-'
                  }
                }
              }
            },
            evaluations: {
              where: {
                participant: {
                  id: {
                    not: {
                      startsWith: 'anon-session-'
                    }
                  }
                }
              }
            },
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    return NextResponse.json(experiment);
  } catch (error) {
    console.error('Error fetching experiment:', error);
    return NextResponse.json({ error: 'Failed to fetch experiment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;
    const { name, description, status, archived, group } = await request.json();

    const experiment = await prisma.experiment.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(group !== undefined && { group }),
        ...(status && { status }),
        ...(archived !== undefined && { 
          archived,
          ...(archived && { archivedAt: new Date() }),
          ...(!archived && { archivedAt: null })
        }),
        updatedAt: new Date(),
        ...(status === 'active' && { startedAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() })
      },
      include: {
        _count: {
          select: {
            comparisons: true,
            participants: {
              where: {
                id: {
                  not: {
                    startsWith: 'anon-session-'
                  }
                }
              }
            },
            evaluations: {
              where: {
                participant: {
                  id: {
                    not: {
                      startsWith: 'anon-session-'
                    }
                  }
                }
              }
            },
          }
        }
      }
    });

    return NextResponse.json(experiment);
  } catch (error) {
    console.error('Error updating experiment:', error);
    return NextResponse.json({ error: 'Failed to update experiment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;
    // First check if experiment exists
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            evaluations: {
              where: {
                participant: {
                  id: {
                    not: {
                      startsWith: 'anon-session-'
                    }
                  }
                }
              }
            },
            singleVideoEvals: {
              where: {
                status: 'completed',
                participant: {
                  id: {
                    not: {
                      startsWith: 'anon-session-'
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment has evaluations and is not archived
    const totalEvaluations = experiment._count.evaluations + (experiment._count.singleVideoEvals || 0);
    if (totalEvaluations > 0 && !experiment.archived) {
      return NextResponse.json(
        { error: 'Cannot delete experiment with existing evaluations. Archive it first.' },
        { status: 400 }
      );
    }

    // Delete related data in correct order to avoid foreign key constraint violations
    
    // First, get all participants for this experiment
    const participants = await prisma.participant.findMany({
      where: { experimentId: id },
      select: { id: true }
    });
    
    const participantIds = participants.map(p => p.id);

    // 1. Delete evaluations first (they reference comparisons and participants)
    await prisma.evaluation.deleteMany({
      where: { experimentId: id }
    });

    // 2. Delete ALL single video evaluations that reference these participants
    // (not just those with matching experimentId, since participants might have 
    // evaluations from different experiments due to session handling)
    if (participantIds.length > 0) {
      await prisma.singleVideoEvaluation.deleteMany({
        where: { 
          participantId: {
            in: participantIds
          }
        }
      });
    }

    // 3. Delete participants (they are no longer referenced by any evaluations)
    await prisma.participant.deleteMany({
      where: { experimentId: id }
    });

    // 4. Delete comparisons (they reference experiment)
    await prisma.comparison.deleteMany({
      where: { experimentId: id }
    });

    // 5. Delete video tasks (they reference experiment)
    await prisma.videoTask.deleteMany({
      where: { experimentId: id }
    });

    // 6. Finally delete the experiment
    await prisma.experiment.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Experiment deleted successfully' });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
}