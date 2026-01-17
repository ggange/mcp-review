import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getClientIp, getIpRateLimitKey, checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { setPublicCacheHeaders } from '@/lib/cdn-cache'
import type { Prisma } from '@prisma/client'
import { generateBadge, generateNotFoundBadge, generateErrorBadge, sanitizeCustomText } from '@/lib/badge'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const clientIp = getClientIp(request)
    const rateLimitKey = getIpRateLimitKey(clientIp, 'badge')
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
          },
        }
      )
    }

    const { id } = await params
    const decodedId = decodeURIComponent(id)
    const url = new URL(request.url)
    const customText = url.searchParams.get('text')
    // Optional query parameter to control whether to show total ratings count
    const showTotals = url.searchParams.get('totals') !== 'false'

    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      select: {
        id: true,
        name: true,
        avgRating: true,
        totalRatings: true,
        iconUrl: true,
      } as Prisma.ServerSelect,
    })

    if (!server) {
      const notFoundSvg = generateNotFoundBadge()
      const response = new NextResponse(notFoundSvg, {
        status: 404,
        headers: {
          'Content-Type': 'image/svg+xml',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=300',
        },
      })
      return setPublicCacheHeaders(response, 300)
    }

    const noRatingsText = sanitizeCustomText(customText)
    const serverWithRatings = server as typeof server & { avgRating: number; totalRatings: number; iconUrl: string | null }
    
    const badgeSvg = generateBadge({
      avgRating: serverWithRatings.avgRating,
      totalRatings: serverWithRatings.totalRatings,
      noRatingsText,
      serverName: serverWithRatings.name,
      brandName: 'MCP Review',
      iconUrl: serverWithRatings.iconUrl,
      showTotals,
    })

    const response = new NextResponse(badgeSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'X-Content-Type-Options': 'nosniff',
      },
    })

    return setPublicCacheHeaders(response, 300)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Badge generation error:', error instanceof Error ? error.message : 'Unknown error')
    }

    const errorSvg = generateErrorBadge()

    return new NextResponse(errorSvg, {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    })
  }
}
