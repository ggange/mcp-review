import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

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
 * @returns Public URL of the uploaded file
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

  // Return public URL
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL is not configured')
  }

  // Ensure publicUrl doesn't end with / and key doesn't start with /
  const cleanUrl = publicUrl.replace(/\/$/, '')
  const cleanKey = key.startsWith('/') ? key.slice(1) : key

  return `${cleanUrl}/${cleanKey}`
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
 * @param serverId - Server ID (organization/name)
 * @param extension - File extension (e.g., 'png', 'jpg', 'svg')
 * @returns Unique key for the file
 */
export function generateIconKey(serverId: string, extension: string): string {
  const timestamp = Date.now()
  const sanitizedServerId = serverId.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `icons/${sanitizedServerId}-${timestamp}.${extension}`
}
