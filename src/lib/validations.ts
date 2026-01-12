import { z } from 'zod'

/**
 * Regex pattern for safe server names
 * Allows: alphanumeric, hyphens, underscores, dots
 * Prevents: path traversal, XSS, shell injection
 */
const SAFE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

/**
 * Regex pattern for organization names
 * Allows: alphanumeric, hyphens, underscores, dots, spaces
 * Spaces are allowed for organization names only
 * Prevents: path traversal, XSS, shell injection (but allows spaces)
 */
const SAFE_ORGANIZATION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\s-]*$/

/**
 * Regex pattern for safe server IDs (organization/name format)
 * Allows: alphanumeric, hyphens, underscores, dots, single forward slash
 * Note: Organization part may contain spaces, but server IDs are URL-encoded in routes
 */
const SAFE_SERVER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\s-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/

/**
 * CUID validation pattern
 * CUIDs start with 'c' followed by alphanumeric characters
 * Length can vary (typically 20-30 characters) depending on implementation
 * This pattern is flexible enough to handle different CUID versions
 */
const CUID_PATTERN = /^c[a-z0-9]{20,30}$/

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
    .regex(SAFE_ORGANIZATION_PATTERN, 'Organization can only contain letters, numbers, hyphens, underscores, dots, and spaces. Must start with a letter or number.')
    .nullable()
    .optional(),
  description: sanitizedText.pipe(z.string().min(1, 'Description is required').max(2000)),
  tools: z.array(toolSchema).optional(),
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
  hasManyTools: z.boolean().optional().default(false),
  completeToolsUrl: z.string()
    .url('Invalid complete tools URL')
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
      { message: 'Complete tools URL must use HTTPS' }
    )
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  // If hasManyTools is true, completeToolsUrl is required
  if (data.hasManyTools && !data.completeToolsUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Complete tools URL is required when hasManyTools is true',
      path: ['completeToolsUrl'],
    })
  }
  // If hasManyTools is false, tools array must have at least one tool
  if (!data.hasManyTools && (!data.tools || data.tools.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one tool is required when hasManyTools is false',
      path: ['tools'],
    })
  }
})

/**
 * Schema for official server uploads (admin only)
 * Organization is required for official servers
 */
export const officialServerUploadSchema = z.object({
  name: z.string()
    .min(1, 'Server name is required')
    .max(100, 'Server name is too long')
    .regex(SAFE_NAME_PATTERN, 'Server name can only contain letters, numbers, hyphens, underscores, and dots. Must start with a letter or number.'),
  organization: z.string()
    .min(1, 'Organization is required for official servers')
    .max(100, 'Organization name is too long')
    .regex(SAFE_ORGANIZATION_PATTERN, 'Organization can only contain letters, numbers, hyphens, underscores, dots, and spaces. Must start with a letter or number.'),
  description: sanitizedText.pipe(z.string().min(1, 'Description is required').max(2000)),
  tools: z.array(toolSchema).optional(),
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
  hasManyTools: z.boolean().optional().default(false),
  completeToolsUrl: z.string()
    .url('Invalid complete tools URL')
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
      { message: 'Complete tools URL must use HTTPS' }
    )
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  // If hasManyTools is true, completeToolsUrl is required
  if (data.hasManyTools && !data.completeToolsUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Complete tools URL is required when hasManyTools is true',
      path: ['completeToolsUrl'],
    })
  }
  // If hasManyTools is false, tools array must have at least one tool
  if (!data.hasManyTools && (!data.tools || data.tools.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one tool is required when hasManyTools is false',
      path: ['tools'],
    })
  }
})

/**
 * Route parameter validation schemas
 */
export const reviewIdParamSchema = z.object({
  id: z.string().regex(CUID_PATTERN, 'Invalid review ID format'),
})

export const serverIdParamSchema = z.object({
  id: z.string()
    .min(1, 'Server ID is required')
    .max(201, 'Server ID is too long')
    .refine(
      (id) => {
        // Decode URL-encoded ID for validation (spaces may be encoded as %20)
        const decodedId = decodeURIComponent(id)
        // Allow CUID format or organization/name format
        // Organization part may contain spaces
        return CUID_PATTERN.test(decodedId) || SAFE_SERVER_ID_PATTERN.test(decodedId)
      },
      { message: 'Invalid server ID format' }
    ),
})

