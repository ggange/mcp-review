import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { randomBytes } from 'crypto'

// R2 is compatible with S3 API
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'mcp-server-icons'

/**
 * Upload a file to R2 storage
 * @param file - File buffer or Uint8Array
 * @param key - Object key (path) in the bucket
 * @param contentType - MIME type of the file
 * @returns Proxy URL for accessing the file through Next.js API route
 */
export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are not configured')
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  await r2Client.send(command)

  // Return proxy URL (bucket stays private)
  // The key will be URL-encoded in the API route
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanKey = key.startsWith('/') ? key.slice(1) : key
  
  // URL encode the key to handle special characters
  const encodedKey = encodeURIComponent(cleanKey)
  
  return `${cleanBaseUrl}/api/icons/${encodedKey}`
}

/**
 * Get an object from R2 storage
 * @param key - Object key (path) in the bucket
 * @returns Object with Body stream (Node.js Readable) and ContentType
 */
export async function getFromR2(key: string): Promise<{ Body: NodeJS.ReadableStream | ReadableStream<Uint8Array> | undefined; ContentType?: string }> {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are not configured')
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const response = await r2Client.send(command)
    
    // AWS SDK v3 returns Body as a Node.js Readable stream
    return {
      Body: response.Body as NodeJS.ReadableStream | ReadableStream<Uint8Array> | undefined,
      ContentType: response.ContentType,
    }
  } catch (error) {
    // Handle AWS SDK errors
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        throw new Error(`Icon not found: ${key}`)
      }
      if (error.name === 'AccessDenied' || error.name === 'Forbidden') {
        throw new Error(`Access denied to R2 bucket`)
      }
    }
    // Re-throw with more context
    throw new Error(`Failed to fetch from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a file from R2 storage
 * @param key - Object key (path) in the bucket
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are not configured')
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await r2Client.send(command)
}

/**
 * Generate a unique key for an icon file
 * @param serverId - Server ID (organization/name, may contain spaces)
 * @param extension - File extension (e.g., 'png', 'jpg')
 * @returns Unique key for the file
 */
export function generateIconKey(serverId: string, extension: string): string {
  const timestamp = Date.now()
  // Add random component to prevent enumeration and collision attacks
  const random = randomBytes(8).toString('hex')
  // Replace spaces with hyphens and keep other safe characters
  // This preserves the organization/name structure while making it filesystem-safe
  const sanitizedServerId = serverId.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._\/-]/g, '_')
  return `icons/${sanitizedServerId}-${timestamp}-${random}.${extension}`
}
