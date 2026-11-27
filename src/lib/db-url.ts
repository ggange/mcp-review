// pg 8 treats sslmode 'prefer', 'require' and 'verify-ca' as 'verify-full' and logs a
// SECURITY WARNING on every connection; pg 9 will switch them to weaker libpq semantics.
// Making 'verify-full' explicit keeps today's behaviour, silences the warning and
// stays secure after the pg 9 upgrade.
const IMPLICIT_VERIFY_FULL_MODES = new Set(['prefer', 'require', 'verify-ca'])

export function withExplicitSslMode(connectionString: string): string {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch {
    return connectionString
  }

  const sslMode = url.searchParams.get('sslmode')
  // uselibpqcompat=true opts into libpq semantics on purpose; leave it alone
  if (!sslMode || !IMPLICIT_VERIFY_FULL_MODES.has(sslMode) || url.searchParams.get('uselibpqcompat') === 'true') {
    return connectionString
  }

  url.searchParams.set('sslmode', 'verify-full')
  return url.toString()
}
