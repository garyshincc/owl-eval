import { customAlphabet } from 'nanoid';

// Create a custom nanoid with URL-safe characters
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

/**
 * Generate a random slug for experiments
 * Format: adjective-noun-random
 */
export function generateSlug(): string {
  const adjectives = [
    'autumn', 'bright', 'calm', 'crystal', 'daring', 'elegant', 'fierce', 'gentle',
    'happy', 'infinite', 'jolly', 'keen', 'lively', 'mystic', 'noble', 'ocean',
    'peaceful', 'quiet', 'radiant', 'serene', 'twilight', 'unique', 'vibrant', 'wise',
    'winter', 'spring', 'summer', 'cosmic', 'stellar', 'lunar', 'solar', 'arctic'
  ];
  
  const nouns = [
    'study', 'eval', 'test', 'trial', 'probe', 'quest', 'search', 'review',
    'analysis', 'research', 'project', 'survey', 'inquiry', 'assessment', 'check',
    'audit', 'scan', 'exam', 'inspection', 'investigation', 'exploration', 'experiment'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const random = nanoid();
  
  return `${adjective}-${noun}-${random}`;
}

/**
 * Validate if a slug is URL-safe
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Convert a string to a URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by checking against existing records
 */
export async function generateUniqueSlug(baseSlug: string, tableName: string): Promise<string> {
  // For now, just return the base slug with a random suffix if needed
  // In a real implementation, you'd check the database for uniqueness
  const { prisma } = await import('@/lib/prisma')
  
  let slug = slugify(baseSlug)
  let counter = 1
  
  while (true) {
    const testSlug = counter === 1 ? slug : `${slug}-${counter}`
    
    // Check if slug exists in the specified table
    const exists = await (prisma as any)[tableName].findUnique({
      where: { slug: testSlug }
    })
    
    if (!exists) {
      return testSlug
    }
    
    counter++
  }
}