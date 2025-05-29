import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-middleware';

const PROLIFIC_API_URL = 'https://api.prolific.com';
const PROLIFIC_API_TOKEN = process.env.PROLIFIC_API_TOKEN;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!PROLIFIC_API_TOKEN) {
      return NextResponse.json({ error: 'Prolific API token not configured' }, { status: 500 });
    }

    const { studyId } = await params;
    const response = await fetch(`${PROLIFIC_API_URL}/api/v1/studies/${studyId}/`, {
      headers: {
        'Authorization': `Token ${PROLIFIC_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: 'Failed to fetch study', details: error }, { status: response.status });
    }

    const study = await response.json();
    return NextResponse.json(study);

  } catch (error) {
    console.error('Error fetching Prolific study:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!PROLIFIC_API_TOKEN) {
      return NextResponse.json({ error: 'Prolific API token not configured' }, { status: 500 });
    }

    const { studyId } = await params;
    const body = await req.json();
    const { action } = body;

    let endpoint = `${PROLIFIC_API_URL}/api/v1/studies/${studyId}/`;
    let method = 'PATCH';
    let requestBody = {};

    switch (action) {
      case 'publish':
        endpoint += 'transition/';
        method = 'POST';
        requestBody = { action: 'PUBLISH' };
        break;
      case 'pause':
        endpoint += 'transition/';
        method = 'POST';
        requestBody = { action: 'PAUSE' };
        break;
      case 'stop':
        endpoint += 'transition/';
        method = 'POST';
        requestBody = { action: 'STOP' };
        break;
      default:
        // For general updates
        requestBody = body;
    }

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Authorization': `Token ${PROLIFIC_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: 'Failed to update study', details: error }, { status: response.status });
    }

    const updatedStudy = await response.json();
    return NextResponse.json(updatedStudy);

  } catch (error) {
    console.error('Error updating Prolific study:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}