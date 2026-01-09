import { NextResponse } from 'next/server'
import { getFromR2 } from '@/lib/r2-storage'

interface RouteParams {
  params: Promise<{ key: string }>
}

/**
 * Proxy endpoint to serve images from private R2 bucket
 * GET /api/icons/[key]
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { key } = await params
    const decodedKey = decodeURIComponent(key)

    // Security: Only allow keys that start with 'icons/' and prevent path traversal
    if (!decodedKey.startsWith('icons/') || decodedKey.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid icon key' },
        { status: 400 }
      )
    }

    // Get object from R2
    const { Body, ContentType } = await getFromR2(decodedKey)

    if (!Body) {
      return NextResponse.json(
        { error: 'Icon not found' },
        { status: 404 }
      )
    }

    // Convert ReadableStream to Response
    const response = new NextResponse(Body, {
      status: 200,
      headers: {
        'Content-Type': ContentType || 'image/png',
        // Cache for 1 year (icons don't change often)
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

    return response
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Icon proxy error:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    if (error instanceof Error && error.message.includes('R2 credentials')) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch icon' },
      { status: 500 }
    )
  }
}
