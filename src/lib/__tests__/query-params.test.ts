import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: {} }))
vi.mock('@/lib/mcp-registry', () => ({ syncRegistry: vi.fn() }))

import {
  MAX_PAGE,
  normalizeSearch,
  parseDateParam,
  parsePage,
  parseRatingBound,
  parseSort,
} from '@/lib/server-queries'

describe('query param parsing', () => {
  it('parsePage falls back to 1 for missing or invalid values and caps large ones', () => {
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('-3')).toBe(1)
    expect(parsePage('7')).toBe(7)
    expect(parsePage('99999999')).toBe(MAX_PAGE)
  })

  it('parseSort only accepts known options', () => {
    expect(parseSort('newest')).toBe('newest')
    expect(parseSort('DROP TABLE')).toBe('most-reviewed')
    expect(parseSort(null)).toBe('most-reviewed')
  })

  it('normalizeSearch trims, lowercases, caps length and ignores 1-char terms', () => {
    expect(normalizeSearch('  GitHub ')).toBe('github')
    expect(normalizeSearch('a')).toBeUndefined()
    expect(normalizeSearch('   ')).toBeUndefined()
    expect(normalizeSearch('x'.repeat(500))).toHaveLength(100)
  })

  it('parseRatingBound clamps to 0-5 and rejects non-numbers', () => {
    expect(parseRatingBound('4.5')).toBe(4.5)
    expect(parseRatingBound('9')).toBe(5)
    expect(parseRatingBound('-1')).toBe(0)
    expect(parseRatingBound('nope')).toBeUndefined()
    expect(parseRatingBound(undefined)).toBeUndefined()
  })

  it('parseDateParam only accepts valid YYYY-MM-DD dates', () => {
    expect(parseDateParam('2026-01-31')).toBe('2026-01-31')
    expect(parseDateParam('2026-13-45')).toBeUndefined()
    expect(parseDateParam('yesterday')).toBeUndefined()
  })
})
