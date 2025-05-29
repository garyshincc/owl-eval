import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { id: params.id },
      include: {
        comparisons: true,
        _count: {
          select: {
            comparisons: true,
            participants: true,
            evaluations: true,
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
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { name, description, status } = await request.json();

    const experiment = await prisma.experiment.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        updatedAt: new Date(),
        ...(status === 'active' && { startedAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() })
      },
      include: {
        _count: {
          select: {
            comparisons: true,
            participants: true,
            evaluations: true,
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
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // First check if experiment exists
    const experiment = await prisma.experiment.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            evaluations: true,
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment has evaluations
    if (experiment._count.evaluations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete experiment with existing evaluations. Archive it instead.' },
        { status: 400 }
      );
    }

    // Delete related data first (comparisons will be deleted due to cascade)
    await prisma.experiment.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Experiment deleted successfully' });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
}