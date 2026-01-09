import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Health check endpoint for load balancers and monitoring
 * GET /api/health
 */
export async function GET() {
  try {
    // Basic health check - just return OK
    // Optionally check database connectivity
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }

    // Optional: Check database connectivity
    // This adds a small delay but provides better health information
    try {
      await prisma.$queryRaw`SELECT 1`
      return NextResponse.json({
        ...healthCheck,
        database: 'connected',
      })
    } catch {
      // Database check failed, but still return 200 to indicate service is running
      // Monitoring systems can check the database field
      return NextResponse.json(
        {
          ...healthCheck,
          database: 'disconnected',
        },
        { status: 200 }
      )
    }
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
