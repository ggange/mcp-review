import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/**
 * Health check endpoint for load balancers and monitoring
 * GET /api/health
 *
 * The database is NOT touched by default: uptime monitors ping this often, and
 * a DB query on every ping keeps the Neon compute awake (no scale-to-zero).
 * GET /api/health?db=1 with "Authorization: Bearer $CRON_SECRET" also checks the DB.
 */
export async function GET(request: Request) {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }

  const { searchParams } = new URL(request.url)
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const wantsDbCheck =
    searchParams.get('db') === '1' &&
    !!cronSecret &&
    !!authHeader &&
    secureCompare(authHeader, `Bearer ${cronSecret}`)

  if (!wantsDbCheck) {
    return NextResponse.json(healthCheck)
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ...healthCheck, database: 'connected' })
  } catch {
    // Still 200: the service is running; monitors can read the database field
    return NextResponse.json({ ...healthCheck, database: 'disconnected' })
  }
}
