import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { serverUploadSchema, officialServerUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'
import { Prisma } from '@prisma/client'
import { deleteFromR2 } from '@/lib/r2-storage'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import { isAdmin } from '@/lib/admin'
import { checkRateLimit, getIpRateLimitKey, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { setPublicCacheHeaders, setPrivateCacheHeaders } from '@/lib/cdn-cache'
import { deleteCache, getCacheKey, invalidateServerListCache } from '@/lib/cache'
import { invalidateServerPage } from '@/lib/server-revalidation'
import { getApprovedReviews, getServerDetail, getUserVotes } from '@/lib/server-queries'
import { fetchGitHubStarsSafe } from '@/lib/github-stars'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Rate limiting for read endpoints to prevent DoS
    const clientIp = getClientIp(request)
    const rateLimitKey = getIpRateLimitKey(clientIp, 'serverDetail')
    const { allowed, resetIn } = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.read.limit,
      RATE_LIMITS.read.windowMs
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
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

    const { id } = await params
    const decodedId = decodeURIComponent(id)

    // Server and reviews come from the shared per-server cache. The server is
    // looked up first so unknown IDs stop at the (negatively cached) miss.
    const [session, server] = await Promise.all([auth(), getServerDetail(decodedId)])

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    const reviews = await getApprovedReviews(decodedId)

    // Only the signed-in viewer's own votes are fetched fresh
    const votes = session?.user?.id
      ? await getUserVotes(session.user.id, reviews.map((r) => r.id))
      : {}
    const ratingsWithVotes = reviews.map((review) => ({
      ...review,
      userVote: review.id in votes ? { helpful: votes[review.id] } : null,
    }))

    const response = NextResponse.json({
      data: {
        ...server,
        ratings: ratingsWithVotes,
      },
    })
    
    // Conditional caching: public if no session, private if authenticated (user-specific vote data)
    if (session?.user?.id) {
      return setPrivateCacheHeaders(response)
    } else {
      return setPublicCacheHeaders(response, 60)
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch server' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to edit servers' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const decodedId = decodeURIComponent(id)

    // Check if server exists
    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      select: { userId: true, source: true, repositoryUrl: true },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    // Check if user can edit this server
    const userIsAdmin = await isAdmin(session.user.id)
    const canEdit = 
      // User owns the server (for user servers)
      (server.source === 'user' && server.userId === session.user.id) ||
      // Admin can edit official servers
      (server.source === 'official' && userIsAdmin)

    if (!canEdit) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only edit your own servers' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Use appropriate validation schema based on server source
    const validationSchema = server.source === 'official' 
      ? officialServerUploadSchema 
      : serverUploadSchema
    const validationResult = validationSchema.safeParse(body)

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

    const { name, organization, description, tools, usageTips, iconUrl, version, repositoryUrl, category: providedCategory, hasManyTools, completeToolsUrl } = validationResult.data

    // Generate new server ID if name or organization changed
    // For official servers, organization is required
    const newServerId = server.source === 'official' 
      ? `${organization}/${name}` 
      : (organization ? `${organization}/${name}` : name)
    
    // Use provided category or fall back to auto-categorization
    const category = providedCategory || categorizeServer(description || null)

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

    // Refresh the star count when the repository changes (fetched server-side only)
    const newRepositoryUrl = repositoryUrl || null
    let starsUpdate: Prisma.ServerUpdateInput = {}
    if (newRepositoryUrl !== server.repositoryUrl) {
      const githubStars = newRepositoryUrl ? await fetchGitHubStarsSafe(newRepositoryUrl) : null
      starsUpdate = {
        githubStars,
        githubStarsSyncedAt: githubStars !== null ? new Date() : null,
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
        repositoryUrl: newRepositoryUrl,
        ...starsUpdate,
        category,
        syncedAt: new Date(),
        hasManyTools: Boolean(hasManyTools ?? false),
        completeToolsUrl: completeToolsUrl ?? null,
      } as Prisma.ServerUpdateInput,
    })

    // Invalidate caches (both IDs when renamed: the old one must 404, the new
    // one may have been negatively cached)
    const invalidationPromises = [
      deleteCache(getCacheKey('dashboard', 'official')), // Official servers cache
      invalidateServerListCache(),
      invalidateServerPage(decodedId, newServerId),
    ]
    if (server.userId) {
      invalidationPromises.push(
        deleteCache(getCacheKey('dashboard', server.userId)),
        deleteCache(getCacheKey('user', server.userId)),
        deleteCache(getCacheKey('user', server.userId, 'servers'))
      )
    }
    await Promise.all(invalidationPromises)

    return NextResponse.json({ data: updatedServer }, { status: 200 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Server update error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update server' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to delete servers' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const decodedId = decodeURIComponent(id)

    // Check if server exists
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

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.id)

    // Allow deletion if:
    // 1. User is admin (can delete any server, including official ones)
    // 2. OR server is user-owned and user owns it
    if (!userIsAdmin && (server.source !== 'user' || server.userId !== session.user.id)) {
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
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to delete icon from R2:', error instanceof Error ? error.message : 'Unknown error')
        }
        // Continue with server deletion even if icon deletion fails
      }
    }

    // Delete server (cascade will delete ratings)
    await prisma.server.delete({
      where: { id: decodedId },
    })

    // Invalidate caches
    const invalidationPromises = [
      deleteCache(getCacheKey('dashboard', 'official')), // Official servers cache
      invalidateServerListCache(),
      invalidateServerPage(decodedId),
    ]
    if (server.userId) {
      invalidationPromises.push(
        deleteCache(getCacheKey('dashboard', server.userId)),
        deleteCache(getCacheKey('user', server.userId)),
        deleteCache(getCacheKey('user', server.userId, 'servers'))
      )
    }
    await Promise.all(invalidationPromises)

    return NextResponse.json({ message: 'Server deleted successfully' }, { status: 200 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Server deletion error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete server' } },
      { status: 500 }
    )
  }
}

