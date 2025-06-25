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
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment has evaluations and is not archived
    if (experiment._count.evaluations > 0 && !experiment.archived) {
      return NextResponse.json(
        { error: 'Cannot delete experiment with existing evaluations. Archive it first.' },
        { status: 400 }
      );
    }

    // Delete related data in correct order to avoid foreign key constraint violations
    // 1. Delete evaluations first (they reference comparisons, participants, and experiment)
    await prisma.evaluation.deleteMany({
      where: { experimentId: id }
    });

    // 2. Delete comparisons (they reference experiment)
    await prisma.comparison.deleteMany({
      where: { experimentId: id }
    });

    // 3. Delete participants (they reference experiment)
    await prisma.participant.deleteMany({
      where: { experimentId: id }
    });

    // 4. Finally delete the experiment
    await prisma.experiment.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Experiment deleted successfully' });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
}