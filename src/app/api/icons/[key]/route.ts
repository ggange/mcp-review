import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getFromR2 } from '@/lib/r2-storage'

interface RouteParams {
  params: Promise<{ key: string }>
}

// Cache configuration: revalidate every 24 hours (icons rarely change)
export const revalidate = 86400

/**
 * Helper function to convert ReadableStream to Buffer
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  
  // Combine all chunks into a single buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  return Buffer.from(result)
}

/**
 * Cached function to fetch icon buffer from R2
 * This reduces R2 API calls by caching the response on the server
 */
const getCachedIconBuffer = unstable_cache(
  async (key: string) => {
    const { Body, ContentType } = await getFromR2(key)
    if (!Body) {
      return { buffer: null, contentType: ContentType }
    }
    const buffer = await streamToBuffer(Body)
    return { buffer, contentType: ContentType }
  },
  ['icon-buffer'],
  {
    revalidate: 86400, // 24 hours - icons rarely change
    tags: ['icons'],
  }
)

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

    // Get cached icon buffer from R2 (reduces R2 API calls significantly)
    const { buffer, contentType } = await getCachedIconBuffer(decodedKey)

    if (!buffer) {
      return NextResponse.json(
        { error: 'Icon not found' },
        { status: 404 }
      )
    }

    // Return cached buffer as Response
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const response = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'image/png',
        // Cache for 1 year in browser/CDN (icons don't change often)
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
