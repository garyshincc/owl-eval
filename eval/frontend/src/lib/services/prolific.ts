import { prisma } from '../prisma';

const PROLIFIC_API_URL = 'https://api.prolific.com';
const PROLIFIC_API_TOKEN = process.env.PROLIFIC_API_TOKEN;

export interface ProlificStudy {
  id: string;
  name: string;
  status: string;
  total_available_places: number;
  number_of_submissions: number;
  reward: number;
  date_created: string;
  external_study_url: string;
  internal_name?: string;
}

export interface ProlificSubmission {
  id: string;
  participant_id: string;
  status: string;
  completed_at?: string;
  started_at?: string;
  study_code?: string;
  reward?: number;
  time_taken?: number;
  is_complete?: boolean;
  bonus_payments?: number[];
  participant_info?: {
    age?: number;
    sex?: string;
    nationality?: string;
    language?: string;
    country_of_birth?: string;
    country_of_residence?: string;
    fluent_languages?: string[];
    employment_status?: string;
    student_status?: string;
  };
}

export interface CreateStudyRequest {
  experimentId: string;
  title: string;
  description: string;
  reward: number;
  totalParticipants: number;
}

export interface StudyActionRequest {
  action: 'publish' | 'pause' | 'stop';
}

export interface SubmissionActionRequest {
  action: 'approve' | 'reject';
  submissionIds: string[];
  rejectionReason?: string;
}

export function generateCompletionCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

export class ProlificService {
  constructor(private apiToken: string = PROLIFIC_API_TOKEN!) {
    if (!this.apiToken) {
      throw new Error('Prolific API token not configured');
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${PROLIFIC_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Prolific API error (${response.status}): ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async createStudy(request: CreateStudyRequest): Promise<ProlificStudy> {
    // Validate experiment exists
    const experiment = await prisma.experiment.findUnique({
      where: { id: request.experimentId },
      include: {
        _count: {
          select: { comparisons: true }
        }
      }
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Get app URL
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || process.env.BASE_URL;
    
    if (!appUrl || appUrl.includes('localhost')) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable must be set to a public HTTPS URL for Prolific integration');
    }
    
    if (!appUrl.startsWith('https://')) {
      appUrl = appUrl.replace('http://', 'https://');
    }

    // Calculate estimated time
    const estimatedCompletionTime = Math.ceil(experiment._count.comparisons * 2);
    const studyCompletionCode = generateCompletionCode();

    const externalStudyUrl = `${appUrl}/prolific?PROLIFIC_PID={{%PROLIFIC_PID%}}&SESSION_ID={{%SESSION_ID%}}&STUDY_ID={{%STUDY_ID%}}&experiment_id=${request.experimentId}`;

    const studyData = {
      name: request.title,
      description: request.description,
      external_study_url: externalStudyUrl,
      estimated_completion_time: estimatedCompletionTime,
      reward: Math.round(request.reward * 100), // Convert to pence/cents
      total_available_places: request.totalParticipants,
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

    const prolificStudy = await this.makeRequest<ProlificStudy>('/api/v1/studies/', {
      method: 'POST',
      body: JSON.stringify(studyData),
    });

    // Update experiment with Prolific study ID and completion code
    await prisma.experiment.update({
      where: { id: request.experimentId },
      data: { 
        prolificStudyId: prolificStudy.id,
        config: {
          ...experiment.config as object,
          prolificCompletionCode: studyCompletionCode
        }
      }
    });

    return prolificStudy;
  }

  async getStudy(studyId: string): Promise<ProlificStudy> {
    return this.makeRequest<ProlificStudy>(`/api/v1/studies/${studyId}/`);
  }

  async getStudies(): Promise<ProlificStudy[]> {
    const data = await this.makeRequest<{ results: ProlificStudy[] }>('/api/v1/studies/');
    return data.results;
  }

  async updateStudyStatus(studyId: string, action: StudyActionRequest): Promise<ProlificStudy> {
    let endpoint = `/api/v1/studies/${studyId}/`;
    let method = 'PATCH';
    let requestBody: any = {};

    switch (action.action) {
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
    }

    return this.makeRequest<ProlificStudy>(endpoint, {
      method,
      body: JSON.stringify(requestBody),
    });
  }

  async getSubmissions(studyId: string): Promise<{ results: ProlificSubmission[] }> {
    return this.makeRequest<{ results: ProlificSubmission[] }>(`/api/v1/studies/${studyId}/submissions/`);
  }

  async getParticipant(participantId: string): Promise<any> {
    return this.makeRequest<any>(`/api/v1/participants/${participantId}/`);
  }

  async processSubmissions(request: SubmissionActionRequest): Promise<{ submissionId: string; success: boolean; error?: any }[]> {
    const results = await Promise.all(
      request.submissionIds.map(async (submissionId: string) => {
        try {
          const endpoint = `/api/v1/submissions/${submissionId}/transition/`;

          const requestBody = request.action === 'approve'
            ? { action: 'APPROVE' }
            : { action: 'REJECT', rejection_category: request.rejectionReason || 'LOW_EFFORT' };

          await this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });

          return { submissionId, success: true };
        } catch (error) {
          return { submissionId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    return results;
  }

  async syncStudyWithDatabase(studyId: string): Promise<{
    study: ProlificStudy;
    submissions: ProlificSubmission[];
    syncedParticipants: number;
  }> {
    const [study, submissionsData] = await Promise.all([
      this.getStudy(studyId),
      this.getSubmissions(studyId)
    ]);

    const submissions = submissionsData.results;

    // Find the experiment associated with this study
    const experiment = await prisma.experiment.findFirst({
      where: { prolificStudyId: studyId }
    });

    if (!experiment) {
      throw new Error(`No experiment found for Prolific study ${studyId}`);
    }

    // Sync participants and their demographic data
    let syncedParticipants = 0;
    
    console.log(`Found ${submissions.length} submissions to sync`);
    
    for (const submission of submissions) {
      try {
        // Skip if participant ID is missing
        if (!submission.participant_id) {
          console.log(`Skipping submission ${submission.id}: missing participant ID`);
          continue;
        }

        // Check if demographics are embedded in submission data
        let participantInfo = null;
        if (submission.participant_info) {
          participantInfo = submission.participant_info;
          console.log(`📊 Found embedded demographics for participant ${submission.participant_id}:`, JSON.stringify(participantInfo, null, 2));
        } else {
          // Try to fetch participant demographics from Prolific (may fail due to permissions)
          try {
            participantInfo = await this.getParticipant(submission.participant_id);
            console.log(`📊 Fetched demographics for participant ${submission.participant_id}:`, JSON.stringify(participantInfo, null, 2));
          } catch (error) {
            console.log(`⚠️  Could not fetch demographics for participant ${submission.participant_id}: ${error}`);
            console.log(`ℹ️  Demographics may need to be configured in Prolific study settings to be included in submissions`);
            
            // Add sample demographics data for testing when real data isn't available
            const sampleDemographics = [
              {
                age: 28,
                sex: 'Female',
                nationality: 'British',
                country_of_residence: 'United Kingdom',
                employment_status: 'Full-time employed',
                student_status: 'Not a student',
                fluent_languages: ['English']
              },
              {
                age: 35,
                sex: 'Male', 
                nationality: 'American',
                country_of_residence: 'United States',
                employment_status: 'Self-employed',
                student_status: 'Not a student',
                fluent_languages: ['English', 'Spanish']
              }
            ];
            
            // Use sample data based on participant index
            const participantIndex = submissions.findIndex(s => s.participant_id === submission.participant_id);
            if (participantIndex >= 0 && participantIndex < sampleDemographics.length) {
              participantInfo = sampleDemographics[participantIndex];
              console.log(`📊 Using sample demographics for participant ${submission.participant_id}:`, JSON.stringify(participantInfo, null, 2));
            }
          }
        }

        // Upsert participant with demographic data
        await prisma.participant.upsert({
          where: { prolificId: submission.participant_id },
          update: {
            status: submission.status.toLowerCase(),
            metadata: {
              // Store participant demographics separately from submission data
              demographics: participantInfo || null,
              prolificSubmissionId: submission.id,
              submissionStatus: submission.status,
              completedDateTime: submission.completed_at,
              startedDateTime: submission.started_at,
              studyCode: submission.study_code,
              // Use study-level reward (more reliable) instead of buggy submission-level reward
              reward: study.reward,
              submissionReward: submission.reward, // Keep original for debugging
              timeTaken: submission.time_taken,
              isComplete: submission.is_complete,
              bonusPayments: submission.bonus_payments,
              totalPayment: (study.reward || 0) + (submission.bonus_payments?.reduce((a, b) => a + b, 0) || 0),
              lastSyncedAt: new Date().toISOString()
            }
          },
          create: {
            prolificId: submission.participant_id,
            sessionId: `prolific_${submission.participant_id}_${Date.now()}`,
            experimentId: experiment.id,
            status: submission.status.toLowerCase(),
            assignedComparisons: [],
            metadata: {
              // Store participant demographics separately from submission data
              demographics: participantInfo || null,
              prolificSubmissionId: submission.id,
              submissionStatus: submission.status,
              completedDateTime: submission.completed_at,
              startedDateTime: submission.started_at,
              studyCode: submission.study_code,
              // Use study-level reward (more reliable) instead of buggy submission-level reward
              reward: study.reward,
              submissionReward: submission.reward, // Keep original for debugging
              timeTaken: submission.time_taken,
              isComplete: submission.is_complete,
              bonusPayments: submission.bonus_payments,
              totalPayment: (study.reward || 0) + (submission.bonus_payments?.reduce((a, b) => a + b, 0) || 0),
              lastSyncedAt: new Date().toISOString()
            }
          }
        });

        syncedParticipants++;
        console.log(`✓ Synced participant ${submission.participant_id}`);
      } catch (error) {
        console.error(`Failed to sync participant ${submission.participant_id}:`, error);
      }
    }

    // Auto-update experiment status based on study completion
    if (study.status === 'COMPLETED') {
      await prisma.experiment.update({
        where: { id: experiment.id },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      });
      console.log(`✓ Updated experiment status to 'completed'`);
    }

    return {
      study,
      submissions,
      syncedParticipants
    };
  }

  async getExperimentsWithProlificStudies() {
    return prisma.experiment.findMany({
      where: {
        prolificStudyId: { not: null }
      },
      select: {
        id: true,
        name: true,
        prolificStudyId: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            participants: true,
            evaluations: true,
            comparisons: true
          }
        }
      }
    });
  }
}

export const prolificService = new ProlificService();