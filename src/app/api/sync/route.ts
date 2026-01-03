import { NextResponse } from 'next/server'
import { syncRegistry } from '@/lib/mcp-registry'

// This endpoint is meant to be called by a cron job
// In production, add proper authentication/authorization

export async function POST(request: Request) {
  // Verify the request is from Vercel Cron or has proper authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Allow if:
  // 1. No CRON_SECRET is set (development mode)
  // 2. Valid authorization header matches
  // 3. Request is from Vercel Cron (has x-vercel-cron header)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isVercelCron

  if (!isAuthorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
      { status: 401 }
    )
  }

  try {
    console.log('Starting registry sync...')
    const startTime = Date.now()
    
    const result = await syncRegistry()
    
    const duration = Date.now() - startTime
    console.log(`Sync completed in ${duration}ms: ${result.synced} servers synced, ${result.errors.length} errors`)

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      duration,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'SYNC_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      },
      { status: 500 }
    )
  }
}

// Also support GET for easier testing (but should be disabled in production)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST in production' } },
      { status: 405 }
    )
  }
  
  return POST(request)
}


