// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '../route'
import { syncGitHubStars } from '@/lib/github-stars'

vi.mock('@/lib/github-stars', () => ({
  syncGitHubStars: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 0, resetIn: 60000 })),
  getIpRateLimitKey: vi.fn(() => 'test-key'),
  getClientIp: vi.fn(() => '127.0.0.1'),
  RATE_LIMITS: { githubStarsSync: { limit: 1, windowMs: 60000 } },
}))

function request(method: 'GET' | 'POST', authorization?: string) {
  return new Request('https://mcpreview.dev/api/sync/github-stars', {
    method,
    headers: authorization ? { authorization } : {},
  })
}

describe('/api/sync/github-stars in production', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.mocked(syncGitHubStars).mockResolvedValue({ checked: 4, updated: 2, errors: [], rateLimited: false })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('runs the sync for a Vercel cron GET with the bearer secret', async () => {
    const response = await GET(request('GET', 'Bearer cron-secret'))

    expect(response.status).toBe(200)
    expect(syncGitHubStars).toHaveBeenCalledOnce()
    expect(await response.json()).toMatchObject({ success: true, checked: 4, updated: 2 })
  })

  it.each([
    ['missing', undefined],
    ['wrong', 'Bearer nope'],
  ])('rejects GET with a %s secret', async (_label, authorization) => {
    const response = await GET(request('GET', authorization))

    expect(response.status).toBe(401)
    expect(syncGitHubStars).not.toHaveBeenCalled()
  })

  it('rejects requests when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '')

    const response = await POST(request('POST'))

    expect(response.status).toBe(401)
    expect(syncGitHubStars).not.toHaveBeenCalled()
  })

  it('returns 500 when the sync throws', async () => {
    vi.mocked(syncGitHubStars).mockRejectedValue(new Error('db down'))

    const response = await POST(request('POST', 'Bearer cron-secret'))

    expect(response.status).toBe(500)
  })
})
