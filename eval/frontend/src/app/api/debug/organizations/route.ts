import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // For debugging only - remove in production
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [DEBUG] Debug endpoint - User ID:', user.id);

    // Get all organizations
    const allOrganizations = await prisma.organization.findMany({
      include: {
        members: true
      }
    });

    // Get organizations for this specific user
    const userOrganizations = await prisma.organizationMember.findMany({
      where: {
        userId: user.id
      },
      include: {
        organization: true
      }
    });

    console.log('🔍 [DEBUG] Debug endpoint - All organizations:', allOrganizations);
    console.log('🔍 [DEBUG] Debug endpoint - User organizations:', userOrganizations);

    return NextResponse.json({
      userId: user.id,
      allOrganizations: allOrganizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        members: org.members.map(member => ({
          userId: member.userId,
          role: member.role
        }))
      })),
      userOrganizations: userOrganizations.map(membership => ({
        organizationId: membership.organizationId,
        role: membership.role,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug
        }
      }))
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}