import { describe, it, expect, vi, beforeEach } from 'vitest'

const servers = [
  ...Array.from({ length: 3 }, (_, i) => ({ id: `u${i}`, source: 'user' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `o${i}`, source: 'official' })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, source: 'registry' })),
]

vi.mock('@/lib/db', () => ({
  prisma: {
    server: {
      groupBy: vi.fn(async () => [
        { source: 'registry', _count: 10 },
        { source: 'user', _count: 3 },
        { source: 'official', _count: 2 },
      ]),
      findMany: vi.fn(async ({ where, skip, take }: { where: { source: unknown }; skip: number; take: number }) =>
        servers.filter((s) => s.source === where.source).slice(skip, skip + take)
      ),
    },
  },
}))

vi.mock('@/lib/cache', () => ({
  getCache: vi.fn(async () => null),
  setCache: vi.fn(),
  getCacheKey: (...parts: string[]) => parts.join(':'),
  SERVER_LIST_CACHE_NAMESPACE: 'servers',
}))

vi.mock('@/lib/mcp-registry', () => ({ syncRegistry: vi.fn() }))

import { queryServers } from '@/lib/server-queries'
import { prisma } from '@/lib/db'

describe('queryServers default ordering', () => {
  beforeEach(() => {
    vi.mocked(prisma.server.findMany).mockClear()
  })

  it('returns user, then official, then registry servers across a page boundary', async () => {
    const result = await queryServers({ page: 1, limit: 4 })
    expect(result.servers.map((s) => s.id)).toEqual(['u0', 'u1', 'u2', 'o0'])
    expect(result.total).toBe(15)
    expect(result.totalPages).toBe(4)
  })

  it('offsets into later segments for later pages', async () => {
    const result = await queryServers({ page: 2, limit: 4 })
    expect(result.servers.map((s) => s.id)).toEqual(['o1', 'r0', 'r1', 'r2'])
  })

  it('only queries the segments a page overlaps', async () => {
    const result = await queryServers({ page: 4, limit: 4 })
    expect(result.servers.map((s) => s.id)).toEqual(['r7', 'r8', 'r9'])
    expect(prisma.server.findMany).toHaveBeenCalledOnce()
  })
})
