import { describe, it, expect } from 'vitest'
import {
  escapeXml,
  sanitizeCustomText,
  measureText,
  getRatingSummary,
  formatCount,
  generateRatingBadge,
  getBadgeEmbed,
  DEFAULT_NO_RATINGS_TEXT,
  MAX_CUSTOM_TEXT_LENGTH,
} from '../badge'

describe('escapeXml', () => {
  it('escapes all XML special characters', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;')
  })
})

describe('sanitizeCustomText', () => {
  it('returns null for missing or blank text', () => {
    expect(sanitizeCustomText(null)).toBeNull()
    expect(sanitizeCustomText('')).toBeNull()
    expect(sanitizeCustomText('   \n\t ')).toBeNull()
  })

  it('collapses whitespace and strips control characters', () => {
    expect(sanitizeCustomText('  rate\n\nus\u0000 now ')).toBe('rate us now')
  })

  it('truncates to the maximum length without splitting emoji', () => {
    const text = '🚀'.repeat(MAX_CUSTOM_TEXT_LENGTH + 10)
    const result = sanitizeCustomText(text)!
    expect(Array.from(result)).toHaveLength(MAX_CUSTOM_TEXT_LENGTH)
    expect(result).toBe('🚀'.repeat(MAX_CUSTOM_TEXT_LENGTH))
  })
})

describe('measureText', () => {
  it('grows with text length and treats wide glyphs as wider', () => {
    expect(measureText('')).toBe(0)
    expect(measureText('iiii')).toBeLessThan(measureText('WWWW'))
    expect(measureText('MCP Review')).toBeGreaterThan(50)
  })
})

describe('formatCount', () => {
  it('shortens large counts', () => {
    expect(formatCount(7)).toBe('7')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1234)).toBe('1.2k')
    expect(formatCount(9999)).toBe('9.9k')
    expect(formatCount(12345)).toBe('12k')
  })
})

describe('getRatingSummary', () => {
  it('formats rating with one decimal and the review count', () => {
    expect(getRatingSummary({ avgRating: 4.25, totalRatings: 8 })).toEqual({
      message: '4.3 · 8 reviews',
      stars: 4.25,
      description: 'MCP Review: rated 4.3 out of 5 from 8 reviews',
    })
  })

  it('uses the singular for one review', () => {
    expect(getRatingSummary({ avgRating: 5, totalRatings: 1 }).message).toBe('5.0 · 1 review')
  })

  it('omits the count when requested', () => {
    expect(getRatingSummary({ avgRating: 3, totalRatings: 8, showTotals: false }).message).toBe('3.0')
  })

  it('falls back to custom or default text without ratings', () => {
    expect(getRatingSummary({ avgRating: 0, totalRatings: 0 })).toMatchObject({ message: DEFAULT_NO_RATINGS_TEXT, stars: null })
    expect(getRatingSummary({ avgRating: null, totalRatings: 0, noRatingsText: 'Rate us' }).message).toBe('Rate us')
  })
})

describe('generateRatingBadge', () => {
  it('produces a well-formed SVG whose width covers both parts', () => {
    const svg = generateRatingBadge({ avgRating: 4.5, totalRatings: 10 })
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('aria-label="MCP Review: rated 4.5 out of 5 from 10 reviews"')

    const width = Number(svg.match(/^<svg[^>]* width="(\d+)"/)![1])
    expect(width).toBeGreaterThan(measureText('MCP Review') + measureText('4.5 · 10 reviews') + 50)
  })

  it('draws five stars filled in proportion to the rating', () => {
    const svg = generateRatingBadge({ avgRating: 2.5, totalRatings: 4 })
    expect(svg.match(/<polygon /g)).toHaveLength(10) // empty row + filled row
    // 2 full stars (10px + 1.5px gap each) + half of the third
    expect(svg).toMatch(/<clipPath id="fill"><rect x="\d+" y="0" width="28" /)
  })

  it('draws no stars without ratings', () => {
    expect(generateRatingBadge({ avgRating: 0, totalRatings: 0 })).not.toContain('<polygon')
  })

  it('never emits unescaped custom text', () => {
    const svg = generateRatingBadge({ avgRating: 0, totalRatings: 0, noRatingsText: '"/><script>x</script>' })
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('"/>&lt;')
  })
})

describe('getBadgeEmbed', () => {
  it('builds badge and page URLs for organization/name IDs', () => {
    const embed = getBadgeEmbed('https://mcpreview.dev/', 'my org/my-server')
    expect(embed.imageUrl).toBe('https://mcpreview.dev/api/badge/my%20org/my-server')
    expect(embed.pageUrl).toBe('https://mcpreview.dev/servers/my%20org%2Fmy-server')
    expect(embed.markdown).toBe(`[![MCP Review](${embed.imageUrl})](${embed.pageUrl})`)
    expect(embed.html).toContain(`<img src="${embed.imageUrl}"`)
  })
})
