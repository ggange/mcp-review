import { describe, it, expect } from 'vitest'
import { cn, formatStars } from '../utils'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('formatStars', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1k'],
    [1234, '1.2k'],
    [1299, '1.2k'],
    [99_999, '99.9k'],
    [123_456, '123k'],
    [1_200_000, '1.2M'],
  ])('formats %i as %s', (count, expected) => {
    expect(formatStars(count)).toBe(expected)
  })
})
