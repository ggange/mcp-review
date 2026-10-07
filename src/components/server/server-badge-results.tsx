import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getBadgeEmbed } from '@/lib/badge'
import { queryServers } from '@/lib/server-queries'

const MAX_RESULTS = 8

interface ServerBadgeResultsProps {
  query: string
  baseUrl: string
}

/**
 * Search results on /badges: each server links to the README Badge card on its page
 */
export async function ServerBadgeResults({ query, baseUrl }: ServerBadgeResultsProps) {
  const [{ servers }, session] = await Promise.all([
    queryServers({ search: query, limit: MAX_RESULTS, page: 1, sort: 'most-reviewed', source: 'all' }),
    auth(),
  ])
  const submitHref = session?.user
    ? '/dashboard?upload=true'
    : '/auth/signin?callbackUrl=' + encodeURIComponent('/dashboard?upload=true')

  if (servers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No servers match &ldquo;{query}&rdquo;.{' '}
        <Link href={submitHref} className="font-medium text-violet-600 hover:underline dark:text-violet-400">
          Submit your server
        </Link>{' '}
        to get a badge.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {servers.map((server) => {
        // Live badge from this deployment, exactly as it will appear in a README
        const badgeSrc = new URL(getBadgeEmbed(baseUrl, server.id).imageUrl).pathname
        return (
          <li key={server.id}>
            <Link
              href={`/servers/${encodeURIComponent(server.id)}#readme-badge`}
              className="flex flex-col gap-2 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{server.name}</span>
                {server.organization && (
                  <span className="block truncate text-xs text-muted-foreground">{server.organization}</span>
                )}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element -- live SVG badge */}
              <img src={badgeSrc} alt={`MCP Review badge for ${server.name}`} height={20} className="h-5 w-auto max-w-full shrink-0 self-start object-contain object-left sm:self-auto" loading="lazy" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
