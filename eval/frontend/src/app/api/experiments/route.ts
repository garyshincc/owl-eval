import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
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
                status: 'completed',
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
    const { name, description, slug, group, comparisons } = await request.json();

    if (!name || !comparisons || !Array.isArray(comparisons)) {
      return NextResponse.json(
        { error: 'Name and comparisons are required' },
        { status: 400 }
      );
    }

    // Validate that all comparisons have required fields
    for (const comp of comparisons) {
      if (!comp.scenarioId || !comp.modelA || !comp.modelB || !comp.videoAUrl || !comp.videoBUrl) {
        return NextResponse.json(
          { error: 'All comparisons must have scenarioId, modelA, modelB, videoAUrl, and videoBUrl' },
          { status: 400 }
        );
      }
    }

    // Create experiment with comparisons
    const experiment = await prisma.experiment.create({
      data: {
        name,
        description: description || null,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        group: group || null,
        status: 'draft',
        config: {
          models: Array.from(new Set([...comparisons.map(c => c.modelA), ...comparisons.map(c => c.modelB)])),
          scenarios: Array.from(new Set(comparisons.map(c => c.scenarioId)))
        },
        createdBy: authResult.user?.id || null,
        comparisons: {
          create: comparisons.map(comp => ({
            scenarioId: comp.scenarioId,
            modelA: comp.modelA,
            modelB: comp.modelB,
            videoAPath: comp.videoAUrl,
            videoBPath: comp.videoBUrl,
            metadata: comp.metadata || {}
          }))
        }
      },
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
                status: 'completed',
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
    console.error('Error creating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}