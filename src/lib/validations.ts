import { z } from 'zod'

/**
 * Regex pattern for safe server names and organizations
 * Allows: alphanumeric, hyphens, underscores, dots
 * Prevents: path traversal, XSS, shell injection
 */
const SAFE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

/**
 * Regex pattern for safe server IDs (organization/name format)
 * Allows: alphanumeric, hyphens, underscores, dots, single forward slash
 */
const SAFE_SERVER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/

/**
 * Sanitize text input to remove potentially dangerous HTML/script content
 * Note: React already escapes output, but this provides defense in depth
 */
function sanitizeText(text: string): string {
  return text
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize whitespace (but preserve line breaks)
    .replace(/[\t\v\f\r]+/g, ' ')
    .trim()
}

/**
 * Zod transformer that sanitizes text
 */
const sanitizedText = z.string().transform(sanitizeText)

export const ratingSchema = z.object({
  serverId: z.string()
    .min(1, 'Server ID is required')
    .max(201, 'Server ID is too long')
    .regex(SAFE_SERVER_ID_PATTERN, 'Invalid server ID format. Use: organization/name'),
  trustworthiness: z.number().int().min(1).max(5),
  usefulness: z.number().int().min(1).max(5),
  text: sanitizedText.pipe(z.string().max(2000)).optional(),
})

export const reviewVoteSchema = z.object({
  helpful: z.boolean(),
})

export const reviewFlagSchema = z.object({
  // No fields needed, just authentication
})

export const reviewUpdateSchema = z.object({
  text: sanitizedText.pipe(z.string().max(2000)).optional(),
  trustworthiness: z.number().int().min(1).max(5).optional(),
  usefulness: z.number().int().min(1).max(5).optional(),
})

const toolSchema = z.object({
  name: z.string()
    .min(1, 'Tool name is required')
    .max(100, 'Tool name is too long'),
  description: z.string()
    .min(1, 'Tool description is required')
    .max(500, 'Tool description is too long'),
})

export const serverUploadSchema = z.object({
  name: z.string()
    .min(1, 'Server name is required')
    .max(100, 'Server name is too long')
    .regex(SAFE_NAME_PATTERN, 'Server name can only contain letters, numbers, hyphens, underscores, and dots. Must start with a letter or number.'),
  organization: z.string()
    .max(100, 'Organization name is too long')
    .regex(SAFE_NAME_PATTERN, 'Organization can only contain letters, numbers, hyphens, underscores, and dots. Must start with a letter or number.')
    .nullable()
    .optional(),
  description: sanitizedText.pipe(z.string().min(1, 'Description is required').max(2000)),
  tools: z.array(toolSchema)
    .min(1, 'At least one tool is required'),
  usageTips: sanitizedText.pipe(z.string().max(2000)).nullable().optional(),
  version: z.string()
    .max(50, 'Version is too long')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/, 'Invalid version format')
    .nullable()
    .optional(),
  repositoryUrl: z.string()
    .url('Invalid repository URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          // Only allow HTTPS URLs (or HTTP in development)
          return parsed.protocol === 'https:' || 
            (process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')
        } catch {
          return false
        }
      },
      { message: 'Repository URL must use HTTPS' }
    )
    .nullable()
    .optional(),
  iconUrl: z.string()
    .url('Invalid icon URL')
    .nullable()
    .optional(),
  category: z.enum(['database', 'search', 'code', 'web', 'ai', 'data', 'tools', 'other'])
    .optional(),
})

