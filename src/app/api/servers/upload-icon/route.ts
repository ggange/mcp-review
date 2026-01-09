import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadToR2, generateIconKey } from '@/lib/r2-storage'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg']

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
    return { valid: false, error: 'File must be PNG or JPG' }
  }

  // Check extension
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: 'File must have .png or .jpg extension' }
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
  }
  return contentTypeMap[extension.toLowerCase()] || 'image/png'
}

export async function POST(request: Request) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to upload icons' } },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(session.user.id, 'iconUpload')
    const { allowed, resetIn } = checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.iconUpload.limit,
      RATE_LIMITS.iconUpload.windowMs
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many icon uploads. Please try again later.' } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
            'Retry-After': String(Math.ceil(resetIn / 1000)),
          }
        }
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

    // Verify server ownership
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: { userId: true, source: true },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    if (server.source !== 'user' || server.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only upload icons for your own servers' } },
        { status: 403 }
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
    // Log error message only (not full error object) to avoid leaking sensitive data
    if (process.env.NODE_ENV !== 'production') {
      console.error('Icon upload error:', error instanceof Error ? error.message : 'Unknown error')
    }
    
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
