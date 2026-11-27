// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: { server: { findMany: vi.fn(), update: vi.fn() } },
}))
vi.mock('@/lib/cache', () => ({ invalidateServerListCache: vi.fn() }))
vi.mock('@/lib/server-revalidation', () => ({ invalidateServerPage: vi.fn() }))

import { prisma } from '@/lib/db'
import { invalidateServerListCache } from '@/lib/cache'
import { invalidateServerPage } from '@/lib/server-revalidation'
import { fetchGitHubStars, fetchGitHubStarsSafe, GitHubRateLimitError, syncGitHubStars } from '../github-stars'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('GITHUB_TOKEN', '')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('fetchGitHubStars', () => {
  it('returns stargazers_count for a GitHub repo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ stargazers_count: 42 }))

    await expect(fetchGitHubStars('https://github.com/owner/repo.git')).resolves.toBe(42)
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo', expect.any(Object))
  })

  it('sends the token when given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ stargazers_count: 1 }))

    await fetchGitHubStars('https://github.com/owner/repo', 'tok')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('token tok')
  })

  it('returns null for non-GitHub URLs without fetching', async () => {
    await expect(fetchGitHubStars('https://gitlab.com/owner/repo')).resolves.toBeNull()
    await expect(fetchGitHubStars(null)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when the repo is not found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not Found' }, 404))
    await expect(fetchGitHubStars('https://github.com/owner/missing')).resolves.toBeNull()
  })

  it('throws GitHubRateLimitError when the rate limit is exhausted', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 403, { 'x-ratelimit-remaining': '0' }))
    await expect(fetchGitHubStars('https://github.com/owner/repo')).rejects.toBeInstanceOf(GitHubRateLimitError)
  })

  it('fetchGitHubStarsSafe swallows rate-limit errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 403, { 'x-ratelimit-remaining': '0' }))
    await expect(fetchGitHubStarsSafe('https://github.com/owner/repo')).resolves.toBeNull()
  })
})

describe('syncGitHubStars', () => {
  it('only writes changed counts and invalidates their caches', async () => {
    vi.mocked(prisma.server.findMany).mockResolvedValue([
      { id: 'a', repositoryUrl: 'https://github.com/o/a', githubStars: 10 },
      { id: 'b', repositoryUrl: 'https://github.com/o/b', githubStars: 5 },
      { id: 'c', repositoryUrl: 'https://github.com/o/c', githubStars: 7 },
    ] as never)
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/a')) return jsonResponse({ stargazers_count: 10 })
      if (url.endsWith('/b')) return jsonResponse({ stargazers_count: 6 })
      return jsonResponse({}, 404)
    })

    const result = await syncGitHubStars()

    expect(result).toEqual({ checked: 3, updated: 1, errors: [], rateLimited: false })
    const updates = vi.mocked(prisma.server.update).mock.calls.map(([args]) => args)
    expect(updates.find((u) => u.where.id === 'b')?.data).toMatchObject({ githubStars: 6 })
    // Unchanged and failed lookups only bump the checked timestamp
    expect(updates.find((u) => u.where.id === 'a')?.data).not.toHaveProperty('githubStars')
    expect(updates.find((u) => u.where.id === 'c')?.data).not.toHaveProperty('githubStars')
    expect(invalidateServerListCache).toHaveBeenCalledOnce()
    expect(invalidateServerPage).toHaveBeenCalledWith('b')
  })

  it('stops early when rate limited and skips cache invalidation if nothing changed', async () => {
    vi.mocked(prisma.server.findMany).mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, repositoryUrl: `https://github.com/o/s${i}`, githubStars: null })) as never
    )
    fetchMock.mockResolvedValue(jsonResponse({}, 403, { 'x-ratelimit-remaining': '0' }))

    const result = await syncGitHubStars()

    expect(result.rateLimited).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(5) // only the first batch
    expect(prisma.server.update).not.toHaveBeenCalled()
    expect(invalidateServerListCache).not.toHaveBeenCalled()
  })

  it('queries only user/official GitHub servers, least recently checked first', async () => {
    vi.mocked(prisma.server.findMany).mockResolvedValue([] as never)

    await syncGitHubStars({ limit: 50 })

    expect(prisma.server.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { source: { in: ['user', 'official'] }, repositoryUrl: { startsWith: 'https://github.com/' } },
      orderBy: { githubStarsSyncedAt: { sort: 'asc', nulls: 'first' } },
      take: 50,
    }))
  })
})
