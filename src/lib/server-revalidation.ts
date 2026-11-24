import { revalidatePath } from 'next/cache'
import { invalidateServerCache } from '@/lib/cache'

/**
 * Call after a server, or anything shown on its page (ratings, reviews, votes),
 * changes: drops its Redis entries and marks the ISR server pages stale so the
 * change shows up on the next request instead of after the revalidate window.
 *
 * Revalidating the whole /servers/[id] route is deliberate: server IDs contain
 * slashes, so matching one page's exact cached path is fragile. Pages of other
 * servers rebuild from their still-valid Redis entries, without DB queries.
 */
export async function invalidateServerPage(...serverIds: string[]): Promise<void> {
  await Promise.all(serverIds.map((id) => invalidateServerCache(id)))
  try {
    revalidatePath('/servers/[id]', 'page')
  } catch {
    // Outside a Next.js request (scripts, tests) there is no page cache to clear
  }
}
