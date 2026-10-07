// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'user-1' } })),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    server: { findUnique: vi.fn() },
    rating: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, resetIn: 60000 })),
  getRateLimitKey: vi.fn(() => 'test-key'),
  RATE_LIMITS: { ratings: { limit: 10, windowMs: 60000 } },
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => ({ isValid: true })),
  csrfErrorResponse: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  deleteCache: vi.fn(),
  getCacheKey: vi.fn(() => 'key'),
}))

vi.mock('@/lib/server-aggregates', () => ({
  recalculateServerAggregates: vi.fn(),
}))

describe('POST /api/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.server.findUnique).mockResolvedValue({ id: 'org/server', source: 'registry', userId: null } as never)
    vi.mocked(prisma.rating.upsert).mockResolvedValue({ id: 'r1' } as never)
  })

  it('approves new ratings but never resets the status of an existing one', async () => {
    const response = await POST(new Request('https://mcpreview.dev/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ serverId: 'org/server', rating: 4, text: 'Updated review' }),
    }))

    expect(response.status).toBe(200)
    const args = vi.mocked(prisma.rating.upsert).mock.calls[0][0]
    expect(args.create).toMatchObject({ status: 'approved' })
    expect(args.update).not.toHaveProperty('status')
    expect(args.update).toMatchObject({ rating: 4, text: 'Updated review' })
  })
})
