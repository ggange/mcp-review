import { describe, it, expect } from 'vitest'

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

