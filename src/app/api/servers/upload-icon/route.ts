import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadToR2, generateIconKey } from '@/lib/r2-storage'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg']

/**
 * Validate file type and size
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 2 MB' }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'File must be PNG, JPG, or SVG' }
  }

  // Check extension
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: 'File must have .png, .jpg, or .svg extension' }
  }

  return { valid: true }
}

/**
 * Get content type from file extension
 */
function getContentType(extension: string): string {
  const contentTypeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
  }
  return contentTypeMap[extension.toLowerCase()] || 'image/png'
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to upload icons' } },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('icon') as File | null
    const serverId = formData.get('serverId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: { code: 'MISSING_FILE', message: 'Icon file is required' } },
        { status: 400 }
      )
    }

    if (!serverId) {
      return NextResponse.json(
        { error: { code: 'MISSING_SERVER_ID', message: 'Server ID is required' } },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE', message: validation.error } },
        { status: 400 }
      )
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const contentType = getContentType(extension)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique key
    const key = generateIconKey(serverId, extension)

    // Upload to R2
    const publicUrl = await uploadToR2(buffer, key, contentType)

    return NextResponse.json({ url: publicUrl, key }, { status: 200 })
  } catch (error) {
    console.error('Icon upload error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('R2 credentials')) {
        return NextResponse.json(
          { error: { code: 'CONFIG_ERROR', message: 'R2 storage is not configured' } },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload icon' } },
      { status: 500 }
    )
  }
}
