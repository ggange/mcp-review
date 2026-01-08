import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { serverUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'
import { Prisma } from '@prisma/client'
import { deleteFromR2 } from '@/lib/r2-storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const decodedId = decodeURIComponent(id)
    const session = await auth()

    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      include: {
        ratings: {
          where: {
            status: 'approved', // Only show approved reviews
          },
          select: {
            id: true,
            trustworthiness: true,
            usefulness: true,
            text: true,
            status: true,
            helpfulCount: true,
            notHelpfulCount: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
            reviewVotes: session?.user?.id
              ? {
                  where: {
                    userId: session.user.id,
                  },
                  select: {
                    helpful: true,
                  },
                  take: 1,
                }
              : false,
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    // Transform ratings to include user vote
    const ratingsWithVotes = server.ratings.map((rating) => {
      const userVote =
        rating.reviewVotes && rating.reviewVotes.length > 0
          ? { helpful: rating.reviewVotes[0].helpful }
          : null

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { reviewVotes: _reviewVotes, ...ratingWithoutVotes } = rating

      return {
        ...ratingWithoutVotes,
        userVote,
      }
    })

    return NextResponse.json({
      data: {
        ...server,
        ratings: ratingsWithVotes,
      },
    })
  } catch (error) {
     
    console.error('API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch server' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to edit servers' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const decodedId = decodeURIComponent(id)

    // Check if server exists and user owns it
    const server = await prisma.server.findUnique({
      where: { id: decodedId },
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
        { error: { code: 'FORBIDDEN', message: 'You can only edit your own servers' } },
        { status: 403 }
      )
    }

    const body = await request.json()
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

    const { name, organization, description, tools, usageTips, iconUrl, version, repositoryUrl } = validationResult.data

    // Generate new server ID if name or organization changed
    const newServerId = organization ? `${organization}/${name}` : name
    const category = categorizeServer(description || null)

    // If ID changed, check for conflicts
    if (newServerId !== decodedId) {
      const existingServer = await prisma.server.findUnique({
        where: { id: newServerId },
      })

      if (existingServer) {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'Server with this name and organization already exists' } },
          { status: 409 }
        )
      }
    }

    // Update server
    const updatedServer = await prisma.server.update({
      where: { id: decodedId },
      data: {
        ...(newServerId !== decodedId && { id: newServerId }),
        name,
        organization: organization || null,
        description: description || null,
        tools: tools ? (tools as Prisma.InputJsonValue) : Prisma.JsonNull,
        usageTips: usageTips || null,
        iconUrl: iconUrl || null,
        version: version || null,
        repositoryUrl: repositoryUrl || null,
        category,
        syncedAt: new Date(),
      },
    })

    return NextResponse.json({ data: updatedServer }, { status: 200 })
  } catch (error) {
    console.error('Server update error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update server' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to delete servers' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const decodedId = decodeURIComponent(id)

    // Check if server exists and user owns it
    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      select: { userId: true, source: true, iconUrl: true },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    if (server.source !== 'user' || server.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own servers' } },
        { status: 403 }
      )
    }

    // Delete icon from R2 if it exists
    if (server.iconUrl) {
      try {
        // Extract key from proxy URL (format: /api/icons/{encodedKey})
        // The key is URL-encoded in the proxy URL
        // Also handle legacy format for backward compatibility
        let key: string | null = null
        
        // Try new proxy URL format first
        const proxyParts = server.iconUrl.split('/api/icons/')
        if (proxyParts.length > 1) {
          const encodedKey = proxyParts[1]
          key = decodeURIComponent(encodedKey)
        } else {
          // Fallback to legacy format (for existing data)
          const legacyParts = server.iconUrl.split('/icons/')
          if (legacyParts.length > 1) {
            key = `icons/${legacyParts[1]}`
          }
        }
        
        if (key && key.startsWith('icons/')) {
          await deleteFromR2(key)
        }
      } catch (error) {
        console.error('Failed to delete icon from R2:', error)
        // Continue with server deletion even if icon deletion fails
      }
    }

    // Delete server (cascade will delete ratings)
    await prisma.server.delete({
      where: { id: decodedId },
    })

    return NextResponse.json({ message: 'Server deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Server deletion error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete server' } },
      { status: 500 }
    )
  }
}

