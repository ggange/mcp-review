// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'
import { uploadToR2 } from '@/lib/r2-storage'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'user-1' } })),
}))

vi.mock('@/lib/db', () => ({
  prisma: { server: { findUnique: vi.fn() } },
}))

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn(),
}))

vi.mock('@/lib/r2-storage', () => ({
  uploadToR2: vi.fn(async () => 'https://mcpreview.dev/api/icons/icons%2Fx.png'),
  generateIconKey: vi.fn(() => 'icons/x.png'),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, resetIn: 60000 })),
  getRateLimitKey: vi.fn(() => 'test-key'),
  RATE_LIMITS: { iconUpload: { limit: 10, windowMs: 60000 } },
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => ({ isValid: true })),
  csrfErrorResponse: vi.fn(),
}))

function uploadRequest(serverId: string) {
  const form = new FormData()
  form.set('icon', new File([new Uint8Array([137, 80, 78, 71])], 'icon.png', { type: 'image/png' }))
  form.set('serverId', serverId)
  return new Request('https://mcpreview.dev/api/servers/upload-icon', { method: 'POST', body: form })
}

function mockServer(source: string, userId: string | null) {
  vi.mocked(prisma.server.findUnique).mockResolvedValue({ source, userId } as never)
}

describe('POST /api/servers/upload-icon permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isAdmin).mockResolvedValue(false)
  })

  it.each(['registry', 'official'])('rejects non-admins for %s servers', async (source) => {
    mockServer(source, null)

    const response = await POST(uploadRequest('org/server'))

    expect(response.status).toBe(403)
    expect(uploadToR2).not.toHaveBeenCalled()
  })

  it('rejects users uploading to someone else\'s server', async () => {
    mockServer('user', 'someone-else')

    const response = await POST(uploadRequest('org/server'))

    expect(response.status).toBe(403)
  })

  it('allows the owner of a user server', async () => {
    mockServer('user', 'user-1')

    const response = await POST(uploadRequest('org/server'))

    expect(response.status).toBe(200)
    expect(uploadToR2).toHaveBeenCalledOnce()
  })

  it('allows admins for registry servers', async () => {
    vi.mocked(isAdmin).mockResolvedValue(true)
    mockServer('registry', null)

    const response = await POST(uploadRequest('org/server'))

    expect(response.status).toBe(200)
  })
})
