import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Tigris S3-compatible configuration using AWS SDK env vars
const tigrisClient = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3 || 'https://fly.storage.tigris.dev',
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.TIGRIS_BUCKET_NAME || 'eval-data'

export async function uploadVideoToTigris(
  file: Buffer,
  key: string,
  contentType: string = 'video/mp4'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read', // Make this object publicly readable
  })

  await tigrisClient.send(command)
  
  // Return public URL - make sure to use the correct format for Tigris
  const endpoint = 'https://${BUCKET_NAME}.fly.storage.tigris.dev'
  return '${endpoint}/${key}'
}

export async function getSignedVideoUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(tigrisClient, command, { expiresIn })
}

// Helper to organize videos by experiment
export function getVideoKey(experimentId: string, comparisonId: string, modelLabel: string): string {
  return `experiments/${experimentId}/comparisons/${comparisonId}/${modelLabel}.mp4`
}