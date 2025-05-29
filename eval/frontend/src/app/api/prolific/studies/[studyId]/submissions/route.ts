import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stackServerApp } from '@/stack';

const PROLIFIC_API_URL = 'https://api.prolific.com';
const PROLIFIC_API_TOKEN = process.env.PROLIFIC_API_TOKEN;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!PROLIFIC_API_TOKEN) {
      return NextResponse.json({ error: 'Prolific API token not configured' }, { status: 500 });
    }

    const { studyId } = await params;
    const response = await fetch(`${PROLIFIC_API_URL}/api/v1/studies/${studyId}/submissions/`, {
      headers: {
        'Authorization': `Token ${PROLIFIC_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: 'Failed to fetch submissions', details: error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching Prolific submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!PROLIFIC_API_TOKEN) {
      return NextResponse.json({ error: 'Prolific API token not configured' }, { status: 500 });
    }

    const { studyId } = await params;

    const body = await req.json();
    const { action, submissionIds, rejectionReason } = body;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Process each submission
    const results = await Promise.all(
      submissionIds.map(async (submissionId: string) => {
        try {
          const endpoint = action === 'approve'
            ? `${PROLIFIC_API_URL}/api/v1/submissions/${submissionId}/transition/`
            : `${PROLIFIC_API_URL}/api/v1/submissions/${submissionId}/transition/`;

          const requestBody = action === 'approve'
            ? { action: 'APPROVE' }
            : { action: 'REJECT', rejection_category: rejectionReason || 'LOW_EFFORT' };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Token ${PROLIFIC_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const error = await response.json();
            return { submissionId, success: false, error };
          }

          return { submissionId, success: true };
        } catch (error) {
          return { submissionId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error processing Prolific submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}