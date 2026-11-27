import { prisma } from '@/lib/db'
import { invalidateServerListCache } from '@/lib/cache'
import { invalidateServerPage } from '@/lib/server-revalidation'
import { validateGitHubUrl } from '@/lib/github-parsing'

/** Thrown when GitHub reports that the API rate limit is exhausted */
export class GitHubRateLimitError extends Error {
  constructor() {
    super('GitHub API rate limit exceeded')
    this.name = 'GitHubRateLimitError'
  }
}

/** App-wide token for background jobs (optional; anonymous calls get 60 req/hour) */
export function getGitHubToken(): string | null {
  return process.env.GITHUB_TOKEN || null
}

/**
 * Fetch the stargazers count for a GitHub repository URL.
 * Returns null when the URL is not a GitHub repo, the repo is missing, or the request fails.
 * Throws GitHubRateLimitError when the rate limit is exhausted, so batch jobs can stop early.
 */
export async function fetchGitHubStars(
  repositoryUrl: string | null | undefined,
  token: string | null = getGitHubToken()
): Promise<number | null> {
  if (!repositoryUrl) return null
  const parsed = validateGitHubUrl(repositoryUrl)
  if (!parsed.valid || !parsed.owner || !parsed.repo) return null

  const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' }
  if (token) headers.Authorization = `token ${token}`

  let response: Response
  try {
    response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
      { headers, cache: 'no-store' }
    )
  } catch {
    return null
  }

  if (
    (response.status === 403 || response.status === 429) &&
    response.headers.get('x-ratelimit-remaining') === '0'
  ) {
    throw new GitHubRateLimitError()
  }
  if (!response.ok) return null

  try {
    const data = (await response.json()) as { stargazers_count?: unknown }
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null
  } catch {
    return null
  }
}

/**
 * Best-effort star lookup for create/update handlers: never throws.
 */
export async function fetchGitHubStarsSafe(
  repositoryUrl: string | null | undefined,
  token?: string | null
): Promise<number | null> {
  try {
    return await fetchGitHubStars(repositoryUrl, token ?? getGitHubToken())
  } catch {
    return null
  }
}

export interface GitHubStarsSyncResult {
  checked: number
  updated: number
  errors: string[]
  rateLimited: boolean
}

const SYNC_CONCURRENCY = 5

/**
 * Refresh star counts for user and official servers with a GitHub repository.
 * Processes the least recently checked servers first, so repeated runs cycle through all of them.
 */
export async function syncGitHubStars({ limit = 300 }: { limit?: number } = {}): Promise<GitHubStarsSyncResult> {
  const result: GitHubStarsSyncResult = { checked: 0, updated: 0, errors: [], rateLimited: false }
  const token = getGitHubToken()

  const servers = await prisma.server.findMany({
    where: {
      source: { in: ['user', 'official'] },
      repositoryUrl: { startsWith: 'https://github.com/' },
    },
    select: { id: true, repositoryUrl: true, githubStars: true },
    orderBy: { githubStarsSyncedAt: { sort: 'asc', nulls: 'first' } },
    take: limit,
  })

  const changedIds: string[] = []

  for (let i = 0; i < servers.length && !result.rateLimited; i += SYNC_CONCURRENCY) {
    const batch = servers.slice(i, i + SYNC_CONCURRENCY)
    await Promise.all(
      batch.map(async (server) => {
        let stars: number | null
        try {
          stars = await fetchGitHubStars(server.repositoryUrl, token)
        } catch (error) {
          if (error instanceof GitHubRateLimitError) {
            result.rateLimited = true
            return
          }
          result.errors.push(`${server.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          return
        }

        // A failed lookup keeps the last known count but still marks the row as checked
        const changed = stars !== null && stars !== server.githubStars
        try {
          await prisma.server.update({
            where: { id: server.id },
            data: changed
              ? { githubStars: stars, githubStarsSyncedAt: new Date() }
              : { githubStarsSyncedAt: new Date() },
          })
          result.checked++
          if (changed) {
            result.updated++
            changedIds.push(server.id)
          }
        } catch (error) {
          result.errors.push(`${server.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
    )
  }

  if (changedIds.length > 0) {
    await Promise.all([invalidateServerListCache(), invalidateServerPage(...changedIds)])
  }

  return result
}
