import { NextResponse } from 'next/server'
import { getFromR2 } from '@/lib/r2-storage'

interface RouteParams {
  params: Promise<{ key: string }>
}

// Note: Cache-Control headers handle caching at the edge
// No need for revalidate export in API routes

/**
 * Helper function to convert Node.js Readable stream or Web ReadableStream to Buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream | ReadableStream<Uint8Array> | undefined): Promise<Buffer> {
  if (!stream) {
    throw new Error('Stream is undefined')
  }
  
  // Handle Node.js Readable stream (from AWS SDK v3)
  // Check if it's a Node.js stream by checking for 'on' method
  if ('on' in stream && typeof stream.on === 'function') {
    return new Promise((resolve, reject) => {
      const nodeStream = stream as NodeJS.ReadableStream
      const chunks: Buffer[] = []
      nodeStream.on('data', (chunk: Buffer) => chunks.push(chunk))
      nodeStream.on('end', () => resolve(Buffer.concat(chunks)))
      nodeStream.on('error', reject)
    })
  }
  
  // Handle Web ReadableStream
  const webStream = stream as ReadableStream<Uint8Array>
  const reader = webStream.getReader()
  const chunks: Uint8Array[] = []
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
  } finally {
    reader.releaseLock()
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
 * Fetch icon buffer from R2
 * Note: unstable_cache doesn't work reliably in API routes, so we fetch directly
 * The CDN Cache-Control headers will handle caching at the edge
 */
async function getIconBuffer(key: string): Promise<{ buffer: Buffer | null; contentType: string | undefined }> {
  const { Body, ContentType } = await getFromR2(key)
  if (!Body) {
    return { buffer: null, contentType: ContentType }
  }
  const buffer = await streamToBuffer(Body)
  return { buffer, contentType: ContentType }
}

/**
 * Proxy endpoint to serve images from private R2 bucket
 * GET /api/icons/[key]
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { key } = await params
    
    // Next.js may already decode the parameter, but we need to handle both cases
    // Try decoding, but if it fails or produces invalid characters, use as-is
    let decodedKey: string
    try {
      // If key contains encoded characters, decode them
      decodedKey = decodeURIComponent(key)
    } catch {
      // If decoding fails, use the key as-is (might already be decoded)
      decodedKey = key
    }

    // Security: Only allow keys that start with 'icons/' and prevent path traversal
    if (!decodedKey.startsWith('icons/') || decodedKey.includes('..')) {
      console.error(`Invalid icon key: ${decodedKey} (original: ${key})`)
      return NextResponse.json(
        { error: 'Invalid icon key' },
        { status: 400 }
      )
    }

    // Get icon buffer from R2
    // Note: We fetch directly since unstable_cache doesn't work reliably in API routes
    // Edge caching via Cache-Control headers handles caching
    let buffer: Buffer | null = null
    let contentType: string | undefined = undefined
    
    try {
      const result = await getIconBuffer(decodedKey)
      buffer = result.buffer
      contentType = result.contentType
    } catch (error) {
      // Log the error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to fetch icon from R2 (key: ${decodedKey}):`, errorMessage)
      
      // If R2 fetch fails, check if it's a credentials error
      if (error instanceof Error && error.message.includes('R2 credentials')) {
        return NextResponse.json(
          { error: 'Storage not configured' },
          { status: 500 }
        )
      }
      // Re-throw to be caught by outer try-catch
      throw error
    }

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
    // Log error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('Icon proxy error:', errorMessage)
      if (errorStack) {
        console.error('Stack trace:', errorStack)
      }
    }
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('R2 credentials')) {
        return NextResponse.json(
          { error: 'Storage not configured' },
          { status: 500 }
        )
      }
      if (error.message.includes('NoSuchKey') || error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Icon not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch icon', details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined },
      { status: 500 }
    )
  }
}
