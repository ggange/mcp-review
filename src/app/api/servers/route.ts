import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serverUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'

type ServerWhereInput = Parameters<typeof prisma.server.findMany>[0]['where']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit

    // Build where clause
    const where: ServerWhereInput = {}
    
    // Add search filter
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' as const } },
        { organization: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ]
    }

    // Add category filter
    if (category && category !== 'all') {
      where.category = category
    }

    // Fetch servers with offset-based pagination
    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        orderBy: [
          { totalRatings: 'desc' },
          { avgTrustworthiness: 'desc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          organization: true,
          description: true,
          version: true,
          repositoryUrl: true,
          avgTrustworthiness: true,
          avgUsefulness: true,
          totalRatings: true,
          category: true,
          syncedAt: true,
          source: true,
        },
      }),
      prisma.server.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: servers,
      total,
      page,
      totalPages,
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
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to upload servers' } },
        { status: 401 }
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
        packages: null,
        remotes: null,
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

