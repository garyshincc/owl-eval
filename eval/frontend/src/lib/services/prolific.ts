import { prisma } from '../prisma';
import Papa from 'papaparse';

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
  'Submission id': string;
  'Participant id': string;
  'Status': string;
  'Completed at'?: string;
  'Started at'?: string;
  'Study code'?: string;
  'Reward'?: string;
  'Time taken'?: string;
  'Is complete'?: string;
  'Bonus payments'?: string;
  'Age'?: string;
  'Sex'?: string;
  'Nationality'?: string;
  'Language'?: string;
  'Country of birth'?: string;
  'Country of residence'?: string;
  'Fluent languages'?: string;
  'Employment status'?: string;
  'Student status'?: string;
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

  private async makeCsvRequest(endpoint: string, options: RequestInit = {}): Promise<string> {
    const response = await fetch(`${PROLIFIC_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Token ${this.apiToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text(); // still text, could be an HTML error page
      throw new Error(`Prolific API error (${response.status}): ${errorText}`);
    }

    return response.text(); // returns raw CSV text
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

    // Update experiment with Prolific study ID, completion code, and initial status
    await prisma.experiment.update({
      where: { id: request.experimentId },
      data: { 
        prolificStudyId: prolificStudy.id,
        config: {
          ...experiment.config as object,
          prolificCompletionCode: studyCompletionCode,
          evaluationsPerComparison: request.totalParticipants,
          prolificStatus: prolificStudy.status // Track initial Prolific status (typically UNPUBLISHED)
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

    const updatedStudy = await this.makeRequest<ProlificStudy>(endpoint, {
      method,
      body: JSON.stringify(requestBody),
    });

    // Update local experiment config with new Prolific status
    const experiment = await prisma.experiment.findFirst({
      where: { prolificStudyId: studyId }
    });

    if (experiment) {
      await prisma.experiment.update({
        where: { id: experiment.id },
        data: {
          config: {
            ...experiment.config as object,
            prolificStatus: updatedStudy.status
          }
        }
      });
      console.log(`✓ Updated local experiment config with Prolific status: ${updatedStudy.status}`);
    }

    return updatedStudy;
  }

  async getSubmissions(studyId: string): Promise<{ results: ProlificSubmission[] }> {
    return this.makeRequest<{ results: ProlificSubmission[] }>(`/api/v1/studies/${studyId}/submissions/`);
  }

  async getParticipant(participantId: string): Promise<any> {
    return this.makeRequest<any>(`/api/v1/participants/${participantId}/`);
  }
  async getSubmissionsExport(
    studyId: string
  ): Promise<{ results: ProlificSubmission[] }> {
    const csvText = await this.makeCsvRequest(`/api/v1/studies/${studyId}/export/`);

    const { data, errors } = Papa.parse<ProlificSubmission>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      throw new Error(`CSV parse error: ${errors.map(e => e.message).join(', ')}`);
    }

    return { results: data };
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
      this.getSubmissionsExport(studyId)
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
        if (!submission['Participant id']) {
          console.log(`Skipping submission ${submission['Submission id']}: missing participant ID`);
          continue;
        }

        const {
          'Age': age,
          'Sex': sex,
          'Nationality': nationality,
          'Language': language,
          'Country of birth': country_of_birth,
          'Country of residence': country_of_residence,
          'Employment status': employment_status,
          'Student status': student_status,
        } = submission;

        const participantInfo = {
          age: age ? Number(age) : undefined,
          sex,
          nationality,
          language,
          country_of_birth,
          country_of_residence,
          employment_status,
          student_status,
        };

        console.log(`Demographics for participant ${submission['Participant id']}:`, JSON.stringify(participantInfo, null, 2));

        // Upsert participant with demographic data
        await prisma.participant.upsert({
            where: { prolificId: submission['Participant id'] },
            update: {
              status: submission['Status'].toLowerCase(),
              metadata: {
                demographics: participantInfo || null,
                prolificSubmissionId: submission['Submission id'],
                submissionStatus: submission['Status'],
                completedDateTime: submission['Completed at'],
                startedDateTime: submission['Started at'],
                studyCode: submission['Study code'],
                reward: study.reward,
                submissionReward: submission['Reward'] ? Number(submission['Reward']) : undefined,
                timeTaken: submission['Time taken'] ? Number(submission['Time taken']) : undefined,
                isComplete: submission['Is complete'] === 'true' || submission['Is complete'] === '1',
                bonusPayments: submission['Bonus payments']
                  ? (() => {
                      try {
                        const parsed = JSON.parse(submission['Bonus payments']);
                        return Array.isArray(parsed) ? parsed.map(Number) : [];
                      } catch {
                        return [];
                      }
                    })()
                  : [],
                totalPayment:
                  (study.reward || 0) +
                  ((submission['Bonus payments']
                    ? (() => {
                        try {
                          const parsed = JSON.parse(submission['Bonus payments']);
                          return Array.isArray(parsed) ? parsed.reduce((a, b) => a + Number(b), 0) : 0;
                        } catch {
                          return 0;
                        }
                      })()
                    : 0) || 0),
                lastSyncedAt: new Date().toISOString()
              }
            },
            create: {
              prolificId: submission['Participant id'],
              sessionId: `prolific_${submission['Participant id']}_${Date.now()}`,
              experimentId: experiment.id,
              status: submission['Status'].toLowerCase(),
              assignedComparisons: [],
              metadata: {
                demographics: participantInfo || null,
                prolificSubmissionId: submission['Submission id'],
                submissionStatus: submission['Status'],
                completedDateTime: submission['Completed at'],
                startedDateTime: submission['Started at'],
                studyCode: submission['Study code'],
                reward: study.reward,
                submissionReward: submission['Reward'] ? Number(submission['Reward']) : undefined,
                timeTaken: submission['Time taken'] ? Number(submission['Time taken']) : undefined,
                isComplete: submission['Is complete'] === 'true' || submission['Is complete'] === '1',
                bonusPayments: submission['Bonus payments']
                  ? (() => {
                      try {
                        const parsed = JSON.parse(submission['Bonus payments']);
                        return Array.isArray(parsed) ? parsed.map(Number) : [];
                      } catch {
                        return [];
                      }
                    })()
                  : [],
                totalPayment:
                  (study.reward || 0) +
                  ((submission['Bonus payments']
                    ? (() => {
                        try {
                          const parsed = JSON.parse(submission['Bonus payments']);
                          return Array.isArray(parsed) ? parsed.reduce((a, b) => a + Number(b), 0) : 0;
                        } catch {
                          return 0;
                        }
                      })()
                    : 0) || 0),
                lastSyncedAt: new Date().toISOString()
              }
            }
          });


        syncedParticipants++;
        console.log(`✓ Synced participant ${submission['Participant id']}`);
      } catch (error) {
        console.error(`Failed to sync participant ${submission['Participant id']}:`, error);
      }
    }

    // Auto-update experiment status based on Prolific study status
    let experimentStatus = experiment.status;
    let statusData: any = {
      config: {
        ...experiment.config as object,
        prolificStatus: study.status
      }
    };

    switch (study.status) {
      case 'UNPUBLISHED':
      case 'DRAFT':
        // If study exists but is unpublished, keep it as draft only if it was never published
        // If it was previously active but now unpublished, that's unusual - keep current status
        if (experiment.status === 'draft') {
          experimentStatus = 'draft';
        }
        break;
      case 'ACTIVE':
      case 'RUNNING':
        experimentStatus = 'active';
        if (!experiment.startedAt) {
          statusData.startedAt = new Date();
        }
        break;
      case 'PAUSED':
        experimentStatus = 'paused';
        break;
      case 'COMPLETED':
        experimentStatus = 'completed';
        statusData.completedAt = new Date();
        break;
      case 'STOPPED':
        experimentStatus = 'paused';
        break;
      default:
        // Keep current status for unknown Prolific statuses
        console.log(`Unknown Prolific status: ${study.status}, keeping experiment status as ${experiment.status}`);
        break;
    }

    if (experimentStatus !== experiment.status) {
      statusData.status = experimentStatus;
      await prisma.experiment.update({
        where: { id: experiment.id },
        data: statusData
      });
      console.log(`✓ Updated experiment status from '${experiment.status}' to '${experimentStatus}' (Prolific: ${study.status})`);
    } else {
      // Still update config to track Prolific status even if experiment status doesn't change
      await prisma.experiment.update({
        where: { id: experiment.id },
        data: statusData
      });
      console.log(`✓ Synced Prolific status '${study.status}' (experiment status unchanged)`);
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
            participants: {
              where: {
                id: {
                  not: {
                    startsWith: 'anon-session-'
                  }
                }
              }
            },
            evaluations: true,
            comparisons: true
          }
        }
      }
    });
  }
}

export const prolificService = new ProlificService();