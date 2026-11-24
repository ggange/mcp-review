/**
 * Resolve a GitHub login from the numeric account ID stored by NextAuth
 * (Account.providerAccountId), using GitHub's public API.
 *
 * No OAuth token is involved: public profile pages must never use (or cache)
 * a user's access token. The response is cached by Next.js for a day, so the
 * unauthenticated GitHub rate limit is not a concern.
 */
export async function getGitHubLogin(providerAccountId: string): Promise<string | null> {
  if (!/^\d+$/.test(providerAccountId)) return null
  try {
    const response = await fetch(`https://api.github.com/user/${providerAccountId}`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 86400 },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { login?: unknown }
    return typeof data.login === 'string' ? data.login : null
  } catch {
    return null
  }
}
