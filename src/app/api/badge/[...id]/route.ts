import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  generateRatingBadge,
  generateNotFoundBadge,
  generateErrorBadge,
  sanitizeCustomText,
} from '@/lib/badge'

// Server IDs are "organization/name" or "name" (see validations.ts)
const MAX_SERVER_ID_LENGTH = 201

interface RouteParams {
  params: Promise<{ id: string[] }>
}

function svgResponse(svg: string, status: number, cacheControl: string): NextResponse {
  return new NextResponse(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      // The badge is a static image: forbid scripts and external loads if opened directly
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  })
}

/**
 * Embeddable README badge showing a server's rating
 * GET /api/badge/{organization}/{name}?totals=false&text=Custom%20text
 *
 * No per-IP rate limiting here: GitHub serves every README image through a
 * small pool of camo proxy IPs, so an IP limit would break badges across all
 * repositories at once. Load is absorbed by CDN caching instead.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const rawId = id.join('/')
    // Next.js already decodes segments; an encoded slash (org%2Fname) may still need decoding
    let serverId = rawId
    try {
      serverId = decodeURIComponent(rawId)
    } catch {
      // Not double-encoded - use as-is
    }

    const server = serverId.length <= MAX_SERVER_ID_LENGTH
      ? await prisma.server.findUnique({
          where: { id: serverId },
          select: { avgRating: true, totalRatings: true },
        })
      : null

    if (!server) {
      // 200 rather than 404: GitHub's image proxy shows a broken image for non-2xx
      // responses, and a readable "not found" badge is more helpful to maintainers.
      return svgResponse(generateNotFoundBadge(), 200, 'public, max-age=60, s-maxage=60')
    }

    const { searchParams } = request.nextUrl
    const svg = generateRatingBadge({
      avgRating: server.avgRating,
      totalRatings: server.totalRatings,
      showTotals: searchParams.get('totals') !== 'false',
      noRatingsText: sanitizeCustomText(searchParams.get('text')),
    })

    return svgResponse(svg, 200, 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400')
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Badge generation error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return svgResponse(generateErrorBadge(), 500, 'no-store')
  }
}
