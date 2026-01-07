import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serverUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'
import { Prisma } from '@prisma/client'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import { queryServers, type SortOption } from '@/lib/server-queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const result = await queryServers({
      search: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      sort: (searchParams.get('sort') || 'most-reviewed') as SortOption,
      minRating: parseFloat(searchParams.get('minRating') || '0'),
      maxRating: searchParams.get('maxRating') ? parseFloat(searchParams.get('maxRating')!) : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1')),
      source: 'all',
      limit: 20,
    })

    return NextResponse.json({
      data: result.servers,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch servers' } },
      { status: 500 }
    )
  }
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
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to upload servers' } },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(session.user.id, 'serverUpload')
    const { allowed, resetIn } = checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.serverUpload.limit,
      RATE_LIMITS.serverUpload.windowMs
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many server uploads. Please try again later.' } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
          }
        }
      )
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = serverUploadSchema.safeParse(body)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
      const firstIssue = issues[0]
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input' 
          } 
        },
        { status: 400 }
      )
    }

    const { name, organization, description, version, repositoryUrl } = validationResult.data

    // Generate server ID in format: organization/name
    const serverId = `${organization}/${name}`

    // Check if server already exists
    const existingServer = await prisma.server.findUnique({
      where: { id: serverId },
    })

    if (existingServer) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Server with this name and organization already exists' } },
        { status: 409 }
      )
    }

    // Categorize server based on description
    const category = categorizeServer(description || null)

    // Create server
    const server = await prisma.server.create({
      data: {
        id: serverId,
        name,
        organization,
        description: description || null,
        version: version || null,
        repositoryUrl: repositoryUrl || null,
        packages: Prisma.JsonNull,
        remotes: Prisma.JsonNull,
        category,
        source: 'user',
        syncedAt: new Date(),
      },
    })

    return NextResponse.json({ data: server }, { status: 201 })
  } catch (error) {
    console.error('Server upload error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload server' } },
      { status: 500 }
    )
  }
}

