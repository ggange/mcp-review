import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serverUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'
import { Prisma } from '@prisma/client'
import { checkRateLimit, getRateLimitKey, getIpRateLimitKey, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import {
  queryServers,
  normalizeSearch,
  parseDateParam,
  parsePage,
  parseRatingBound,
  parseSort,
} from '@/lib/server-queries'
import { setPublicCacheHeaders } from '@/lib/cdn-cache'
import { deleteCache, getCacheKey, invalidateServerListCache } from '@/lib/cache'
import { invalidateServerPage } from '@/lib/server-revalidation'
import { fetchGitHubStarsSafe } from '@/lib/github-stars'

export async function GET(request: Request) {
  try {
    // Rate limiting for read endpoints to prevent DoS
    const clientIp = getClientIp(request)
    const rateLimitKey = getIpRateLimitKey(clientIp, 'serverList')
    const { allowed, resetIn } = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.serverList.limit,
      RATE_LIMITS.serverList.windowMs
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

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const result = await queryServers({
      search: normalizeSearch(searchParams.get('q')),
      category: searchParams.get('category')?.slice(0, 32) || undefined,
      sort: parseSort(searchParams.get('sort')),
      minRating: parseRatingBound(searchParams.get('minRating')) ?? 0,
      maxRating: parseRatingBound(searchParams.get('maxRating')),
      dateFrom: parseDateParam(searchParams.get('dateFrom')),
      dateTo: parseDateParam(searchParams.get('dateTo')),
      hasGithub: searchParams.get('hasGithub') === 'true',
      page: parsePage(searchParams.get('page')),
      source: 'all',
      limit: 20,
    })

    const response = NextResponse.json({
      data: result.servers,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    })
    
    // Add CDN caching headers for public API responses
    return setPublicCacheHeaders(response, 60)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API error:', error instanceof Error ? error.message : 'Unknown error')
    }
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
    const { allowed, resetIn } = await checkRateLimit(
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
            'Retry-After': String(Math.ceil(resetIn / 1000)),
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

    const { name, organization, description, tools, usageTips, iconUrl, version, repositoryUrl, category, hasManyTools, completeToolsUrl } = validationResult.data

    // Get GitHub username for author
    let authorUsername: string | null = null
    const githubAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'github',
      },
      select: {
        access_token: true,
      },
    })

    if (githubAccount?.access_token) {
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${githubAccount.access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          next: { revalidate: 300 }, // Cache GitHub API responses for 5 minutes
        })

        if (response.ok) {
          const githubUser = await response.json()
          authorUsername = githubUser.login
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to fetch GitHub username:', error instanceof Error ? error.message : 'Unknown error')
        }
      }
    }

    // Generate server ID in format: organization/name or just name if no organization
    const serverId = organization ? `${organization}/${name}` : name

    // Check if server already exists
    const existingServer = await prisma.server.findUnique({
      where: { id: serverId },
    })

    if (existingServer) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: organization ? 'Server with this name and organization already exists' : 'Server with this name already exists' } },
        { status: 409 }
      )
    }

    // Use provided category or fall back to auto-categorization
    const finalCategory = category || categorizeServer(description || null)

    // Star count is always fetched server-side (never trusted from the client)
    const githubStars = repositoryUrl
      ? await fetchGitHubStarsSafe(repositoryUrl, githubAccount?.access_token)
      : null

    // Create server
    const server = await prisma.server.create({
      data: {
        id: serverId,
        name,
        organization: organization || null,
        description: description || null,
        tools: tools ? (tools as Prisma.InputJsonValue) : Prisma.JsonNull,
        usageTips: usageTips || null,
        iconUrl: iconUrl || null,
        version: version || null,
        repositoryUrl: repositoryUrl || null,
        githubStars,
        githubStarsSyncedAt: githubStars !== null ? new Date() : null,
        packages: Prisma.JsonNull,
        remotes: Prisma.JsonNull,
        category: finalCategory,
        source: 'user',
        syncedAt: new Date(),
        userId: session.user.id,
        authorUsername,
        hasManyTools: hasManyTools || false,
        completeToolsUrl: completeToolsUrl || null,
      },
    })

    // Invalidate user dashboard and profile cache
    await Promise.all([
      deleteCache(getCacheKey('dashboard', session.user.id)),
      deleteCache(getCacheKey('user', session.user.id)),
      deleteCache(getCacheKey('user', session.user.id, 'servers')),
      invalidateServerListCache(),
      // The ID may have been negatively cached by an earlier lookup
      invalidateServerPage(serverId),
    ])

    return NextResponse.json({ data: server }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Server upload error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload server' } },
      { status: 500 }
    )
  }
}

