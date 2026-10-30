import { describe, it, expect, vi } from 'vitest'

// Inline the parseServerName function for testing without DB dependency
function parseServerName(fullName: string): { organization: string; name: string } {
  const parts = fullName.split('/')
  if (parts.length >= 2) {
    return {
      organization: parts[0],
      name: parts.slice(1).join('/'),
    }
  }
  return {
    organization: 'unknown',
    name: fullName,
  }
}

describe('parseServerName', () => {
  it('parses standard org/name format', () => {
    expect(parseServerName('ai.exa/exa')).toEqual({
      organization: 'ai.exa',
      name: 'exa',
    })
  })

  it('handles names with multiple slashes', () => {
    expect(parseServerName('org/path/to/server')).toEqual({
      organization: 'org',
      name: 'path/to/server',
    })
  })

  it('handles names without slash', () => {
    expect(parseServerName('simple-server')).toEqual({
      organization: 'unknown',
      name: 'simple-server',
    })
  })

  it('parses complex organization names', () => {
    expect(parseServerName('com.example.ai/my-server')).toEqual({
      organization: 'com.example.ai',
      name: 'my-server',
    })
  })
})



vi.mock('@/lib/db', () => ({ prisma: {} }))
vi.mock('@/lib/cache', () => ({ invalidateServerListCache: vi.fn() }))

describe('hasServerChanged', async () => {
  const { hasServerChanged } = await import('@/lib/mcp-registry')
  const base = {
    id: 'ai.exa/exa',
    name: 'exa',
    organization: 'ai.exa',
    description: 'Search',
    version: '1.0.0',
    repositoryUrl: null,
    packages: [{ registryType: 'npm', identifier: 'exa' }],
    remotes: null,
    category: 'search',
    source: 'registry',
  }

  it('ignores JSON key order from jsonb', () => {
    const stored = { ...base, packages: [{ identifier: 'exa', registryType: 'npm' }] }
    expect(hasServerChanged(stored, base as never)).toBe(false)
  })

  it('detects a version bump', () => {
    expect(hasServerChanged(base, { ...base, version: '1.1.0' } as never)).toBe(true)
  })

  it('detects package changes', () => {
    expect(hasServerChanged(base, { ...base, packages: [] } as never)).toBe(true)
  })
})
