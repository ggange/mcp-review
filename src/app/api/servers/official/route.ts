import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { officialServerUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'
import { Prisma } from '@prisma/client'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import { requireAdmin } from '@/lib/admin'

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
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to upload official servers' } },
        { status: 401 }
      )
    }

    // Require admin access
    try {
      await requireAdmin(session)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forbidden'
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = officialServerUploadSchema.safeParse(body)
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

    const { name, organization, description, tools, usageTips, iconUrl, version, repositoryUrl, category } = validationResult.data

    // Generate server ID in format: organization/name (organization is required for official servers)
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

    // Use provided category or fall back to auto-categorization
    const finalCategory = category || categorizeServer(description || null)

    // Create official server (no userId or authorUsername for official servers)
    const server = await prisma.server.create({
      data: {
        id: serverId,
        name,
        organization: organization,
        description: description || null,
        tools: tools ? (tools as Prisma.InputJsonValue) : Prisma.JsonNull,
        usageTips: usageTips || null,
        iconUrl: iconUrl || null,
        version: version || null,
        repositoryUrl: repositoryUrl || null,
        packages: Prisma.JsonNull,
        remotes: Prisma.JsonNull,
        category: finalCategory,
        source: 'official',
        syncedAt: new Date(),
        userId: null, // Official servers are not tied to a user
        authorUsername: null, // Official servers represent organizations, not authors
      },
    })

    return NextResponse.json({ data: server }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Official server upload error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload official server' } },
      { status: 500 }
    )
  }
}
