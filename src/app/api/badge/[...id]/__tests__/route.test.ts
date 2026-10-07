// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    server: {
      findUnique: vi.fn(),
    },
  },
}))

const findUnique = vi.mocked(prisma.server.findUnique)

function callBadge(segments: string[], query = '') {
  const request = new NextRequest(`https://mcpreview.dev/api/badge/${segments.join('/')}${query}`)
  return GET(request, { params: Promise.resolve({ id: segments }) })
}

function mockServer(avgRating: number, totalRatings: number) {
  findUnique.mockResolvedValue({ avgRating, totalRatings } as never)
}

describe('GET /api/badge/[...id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the rating and total for a rated server', async () => {
    mockServer(4.567, 12)

    const response = await callBadge(['my-org', 'my-server'])
    const svg = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect(svg).toContain('★ 4.6 (12)')
    expect(svg).toContain('MCP Review')
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'my-org/my-server' } }))
  })

  it('hides the total when totals=false', async () => {
    mockServer(4.5, 12)

    const svg = await (await callBadge(['my-server'], '?totals=false')).text()

    expect(svg).toContain('★ 4.5<')
    expect(svg).not.toContain('(12)')
  })

  it('shows the default call to action when there are no ratings', async () => {
    mockServer(0, 0)

    const svg = await (await callBadge(['my-server'])).text()

    expect(svg).toContain('be the first to review')
  })

  it('uses sanitized custom text when there are no ratings', async () => {
    mockServer(0, 0)

    const svg = await (await callBadge(['my-server'], `?text=${encodeURIComponent('<script>alert(1)</script> & rate us')}`)).text()

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; rate us')
  })

  it('ignores custom text once the server has ratings', async () => {
    mockServer(4, 3)

    const svg = await (await callBadge(['my-server'], '?text=Rate%20us')).text()

    expect(svg).toContain('★ 4.0 (3)')
    expect(svg).not.toContain('Rate us')
  })

  it('accepts an encoded slash in a single segment', async () => {
    mockServer(5, 1)

    await callBadge(['my-org%2Fmy-server'])

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'my-org/my-server' } }))
  })

  it('returns a readable not-found badge with a 200 status', async () => {
    findUnique.mockResolvedValue(null)

    const response = await callBadge(['missing'])

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('server not found')
    expect(response.headers.get('Cache-Control')).toContain('max-age=60')
  })

  it('skips the database for oversized IDs', async () => {
    const response = await callBadge(['a'.repeat(300)])

    expect(findUnique).not.toHaveBeenCalled()
    expect(await response.text()).toContain('server not found')
  })

  it('sets CDN cache and security headers', async () => {
    mockServer(4.5, 2)

    const response = await callBadge(['my-server'])

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300, stale-while-revalidate=86400')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'")
  })

  it('returns an uncached error badge when the database fails', async () => {
    findUnique.mockRejectedValue(new Error('db down'))

    const response = await callBadge(['my-server'])

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).toContain('unavailable')
  })
})
