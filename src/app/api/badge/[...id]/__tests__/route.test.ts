import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    server: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getIpRateLimitKey: vi.fn(() => 'test-key'),
  getClientIp: vi.fn(() => '127.0.0.1'),
  RATE_LIMITS: {
    read: {
      limit: 100,
      windowMs: 60000,
    },
  },
}))

vi.mock('@/lib/cdn-cache', () => ({
  setPublicCacheHeaders: vi.fn((response, maxAge) => {
    response.headers.set('Cache-Control', `public, max-age=${maxAge}`)
    return response
  }),
}))

describe('GET /api/badge/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: rate limit allows request
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetIn: 60000,
    })
  })

  describe('with ratings', () => {
    it('generates badge with single rating', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      expect(svg).toContain('4.5')
      expect(svg).toContain('MCP Review')
    })

    it('formats ratings to one decimal place', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 4.567,
        totalRatings: 5,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(svg).toContain('4.6')
    })

    it('handles zero ratings correctly', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 0,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      // Should show default "no ratings" message
      expect(svg).toContain('Available on MCP Review')
    })
  })

  describe('without ratings', () => {
    it('displays default message when no ratings exist', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(200)
      expect(svg).toContain('Available on MCP Review')
    })

    it('displays custom text when provided via query parameter', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server?text=Come%20rate%20%26%20review%20us')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(200)
      // XML requires & to be escaped as &amp;
      expect(svg).toContain('Come rate &amp; review us')
      expect(svg).not.toContain('Come rate & review us')
    })

    it('truncates custom text that exceeds max length', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const longText = 'A'.repeat(60) // Exceeds 50 char limit
      const request = new NextRequest(`https://example.com/api/badge/test-server?text=${encodeURIComponent(longText)}`)
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      // Should be truncated to 50 characters
      expect(svg).toContain('A'.repeat(50))
      expect(svg).not.toContain('A'.repeat(60))
    })

    it('handles empty custom text parameter', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server?text=')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(svg).toContain('Available on MCP Review')
    })
  })

  describe('edge cases', () => {
    it('returns 404 badge when server not found', async () => {
      vi.mocked(prisma.server.findUnique).mockResolvedValue(null)

      const request = new NextRequest('https://example.com/api/badge/non-existent')
      const params = Promise.resolve({ id: ['non-existent'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(404)
      expect(svg).toContain('Not Found')
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })

    it('handles URL-encoded server IDs', async () => {
      const mockServer = {
        id: 'org/name with spaces',
        name: 'Name With Spaces',
        avgRating: 4.0,
        totalRatings: 5,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const encodedId = encodeURIComponent('org/name with spaces')
      const request = new NextRequest(`https://example.com/api/badge/${encodedId}`)
      const params = Promise.resolve({ id: [encodedId] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(200)
      expect(svg).toContain('4.0')
    })

    it('handles server IDs with special characters', async () => {
      const mockServer = {
        id: 'test@server#123',
        name: 'Test Server',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const encodedId = encodeURIComponent('test@server#123')
      const request = new NextRequest(`https://example.com/api/badge/${encodedId}`)
      const params = Promise.resolve({ id: [encodedId] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(200)
      expect(svg).toContain('4.5')
    })

    it('handles null rating values gracefully', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(200)
      expect(svg).toContain('Available on MCP Review')
    })
  })

  describe('security', () => {
    it('escapes HTML/SVG tags in custom text', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const maliciousText = '<script>alert("xss")</script>'
      const request = new NextRequest(`https://example.com/api/badge/test-server?text=${encodeURIComponent(maliciousText)}`)
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(svg).not.toContain('<script>')
      expect(svg).toContain('&lt;script&gt;')
      expect(svg).toContain('&lt;/script&gt;')
    })

    it('escapes special XML characters', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const specialChars = 'Text with <>&"\' characters'
      const request = new NextRequest(`https://example.com/api/badge/test-server?text=${encodeURIComponent(specialChars)}`)
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(svg).toContain('&lt;')
      expect(svg).toContain('&gt;')
      expect(svg).toContain('&amp;')
      expect(svg).toContain('&quot;')
      expect(svg).toContain('&apos;')
    })

    it('handles XSS attempts in server name', async () => {
      const mockServer = {
        id: 'test-server',
        name: '<svg onload="alert(1)">',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      // Server name is not used in the badge template, so we can't verify its escaping
      // But we can verify that XSS doesn't appear in the output
      expect(svg).not.toContain('onload=')
      expect(svg).not.toContain('<svg onload')
    })

    it('enforces text length limit', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: null,
        totalRatings: 0,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const longText = 'A'.repeat(100)
      const request = new NextRequest(`https://example.com/api/badge/test-server?text=${encodeURIComponent(longText)}`)
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      // Should be truncated to 50 characters
      const truncated = 'A'.repeat(50)
      expect(svg).toContain(truncated)
      expect(svg).not.toContain(longText)
    })
  })

  describe('SVG validation', () => {
    it('returns valid SVG XML structure', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(svg).toContain('<svg')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('</svg>')
    })

    it('includes proper viewBox attribute', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(svg).toMatch(/viewBox="[^"]+"/)
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetIn: 30000,
      })

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })

      expect(response.status).toBe(429)
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('caching', () => {
    it('sets appropriate cache headers', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })

      expect(response.headers.get('Cache-Control')).toContain('max-age=300')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })
  })

  describe('error handling', () => {
    it('returns error badge on database error', async () => {
      vi.mocked(prisma.server.findUnique).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('https://example.com/api/badge/test-server')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })
      const svg = await response.text()

      expect(response.status).toBe(500)
      expect(svg).toContain('Error')
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })

    it('handles malformed URL gracefully', async () => {
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        avgRating: 4.5,
        totalRatings: 10,
      }

      ;(vi.mocked(prisma.server.findUnique) as unknown as Mock).mockResolvedValue(mockServer)

      // Invalid URL but should still work
      const request = new NextRequest('https://example.com/api/badge/test-server?invalid=param')
      const params = Promise.resolve({ id: ['test-server'] })

      const response = await GET(request, { params })

      expect(response.status).toBe(200)
    })
  })
})
