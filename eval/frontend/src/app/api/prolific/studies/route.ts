import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-middleware';

const PROLIFIC_API_URL = 'https://api.prolific.com';
const PROLIFIC_API_TOKEN = process.env.PROLIFIC_API_TOKEN;

function generateCompletionCode(): string {
  // Generate a random 8-character alphanumeric code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!PROLIFIC_API_TOKEN) {
      return NextResponse.json({ error: 'Prolific API token not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { experimentId, title, description, reward, totalParticipants } = body;

    // Check if we have the required environment variable
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || process.env.BASE_URL;
    
    // For development, we need to use a public URL that Prolific can access
    // You should set NEXT_PUBLIC_APP_URL to your actual domain
    if (!appUrl || appUrl.includes('localhost')) {
      return NextResponse.json({ 
        error: 'NEXT_PUBLIC_APP_URL environment variable must be set to a public HTTPS URL for Prolific integration. Localhost URLs are not allowed by Prolific.' 
      }, { status: 400 });
    }
    
    // Ensure HTTPS for Prolific
    if (!appUrl.startsWith('https://')) {
      appUrl = appUrl.replace('http://', 'https://');
    }
    
    console.log('App URL:', appUrl);

    // Validate experiment exists
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        _count: {
          select: {
            comparisons: true
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Calculate estimated time based on number of comparisons
    const estimatedCompletionTime = Math.ceil(experiment._count.comparisons * 2); // 2 minutes per comparison

    // Generate a unique completion code for this study
    const studyCompletionCode = generateCompletionCode();

    // Build the external study URL (using Prolific's parameter format)
    const externalStudyUrl = `${appUrl}/prolific?PROLIFIC_PID={{%PROLIFIC_PID%}}&SESSION_ID={{%SESSION_ID%}}&STUDY_ID={{%STUDY_ID%}}&experiment_id=${experimentId}`;
    console.log('External study URL:', externalStudyUrl);

    const studyData = {
      name: title,
      description: description,
      external_study_url: externalStudyUrl,
      estimated_completion_time: estimatedCompletionTime,
      reward: Math.round(reward * 100), // Convert to pence/cents
      total_available_places: totalParticipants,
      prolific_id_option: "url_parameters",
      completion_codes: [
        {
          code: studyCompletionCode,
          code_type: "COMPLETED",
          actions: [
            { action: "AUTOMATICALLY_APPROVE" }
          ]
        }
      ],
      device_compatibility: ["desktop"],
      peripheral_requirements: ["audio"],
      filters: [
        {
          filter_id: "approval_rate",
          selected_range: {
            lower: 95,
            upper: 100
          }
        }
      ]
    };
    console.log('Study data:', JSON.stringify(studyData, null, 2));

    // Create study on Prolific
    const prolificResponse = await fetch(`${PROLIFIC_API_URL}/api/v1/studies/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${PROLIFIC_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studyData),
    });

    if (!prolificResponse.ok) {
      const error = await prolificResponse.json();
      console.error('Prolific API error:', error);
      
      // Extract specific validation errors
      let errorMessage = 'Failed to create Prolific study';
      if (error.error?.detail) {
        const details = error.error.detail;
        const errorMessages = [];
        
        for (const [field, messages] of Object.entries(details)) {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          }
        }
        
        if (errorMessages.length > 0) {
          errorMessage += ': ' + errorMessages.join('; ');
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage, 
        details: error 
      }, { status: 500 });
    }

    const prolificStudy = await prolificResponse.json();

    // Update experiment with Prolific study ID and completion code
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { 
        prolificStudyId: prolificStudy.id,
        config: {
          ...experiment.config as object,
          prolificCompletionCode: studyCompletionCode
        }
      }
    });

    return NextResponse.json({
      studyId: prolificStudy.id,
      status: prolificStudy.status,
      internalName: prolificStudy.internal_name,
      externalStudyUrl: prolificStudy.external_study_url
    });

  } catch (error) {
    console.error('Error creating Prolific study:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {

    if (!PROLIFIC_API_TOKEN) {
      return NextResponse.json({ error: 'Prolific API token not configured' }, { status: 500 });
    }

    // Get experiments with Prolific studies
    const experiments = await prisma.experiment.findMany({
      where: {
        prolificStudyId: { not: null }
      },
      select: {
        id: true,
        name: true,
        prolificStudyId: true
      }
    });

    // Fetch study details from Prolific
    const studies = await Promise.all(
      experiments.map(async (exp: any) => {
        try {
          const response = await fetch(`${PROLIFIC_API_URL}/api/v1/studies/${exp.prolificStudyId}/`, {
            headers: {
              'Authorization': `Token ${PROLIFIC_API_TOKEN}`,
            },
          });

          if (!response.ok) {
            return {
              experimentId: exp.id,
              experimentName: exp.name,
              prolificStudyId: exp.prolificStudyId,
              error: 'Failed to fetch study details'
            };
          }

          const study = await response.json();
          return {
            experimentId: exp.id,
            experimentName: exp.name,
            prolificStudyId: exp.prolificStudyId,
            status: study.status,
            totalParticipants: study.total_available_places,
            completedSubmissions: study.number_of_submissions,
            reward: study.reward / 100, // Convert from pence/cents
            createdAt: study.date_created
          };
        } catch (error) {
          return {
            experimentId: exp.id,
            experimentName: exp.name,
            prolificStudyId: exp.prolificStudyId,
            error: 'Failed to fetch study details'
          };
        }
      })
    );

    return NextResponse.json({ studies });

  } catch (error) {
    console.error('Error fetching Prolific studies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}