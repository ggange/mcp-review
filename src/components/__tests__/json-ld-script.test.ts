import { describe, it, expect } from 'vitest'
import { serializeJsonLd } from '../json-ld-script'

describe('serializeJsonLd', () => {
  it('escapes "<" so user text cannot close the script tag', () => {
    const data = { reviewBody: 'Nice</script><script>alert(1)</script>' }

    const serialized = serializeJsonLd(data)

    expect(serialized).not.toContain('<')
    expect(serialized).toContain('\\u003c/script>')
  })

  it('still parses back to the original data', () => {
    const data = { name: 'a < b', nested: { text: '<b>bold</b>' } }

    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })
})
