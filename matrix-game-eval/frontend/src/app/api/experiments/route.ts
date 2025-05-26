import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
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
    
    return NextResponse.json(experiments);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}