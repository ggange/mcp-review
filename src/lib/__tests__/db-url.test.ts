import { describe, it, expect } from 'vitest'
import { withExplicitSslMode } from '../db-url'

describe('withExplicitSslMode', () => {
  it.each(['prefer', 'require', 'verify-ca'])('turns sslmode=%s into verify-full', (mode) => {
    const url = withExplicitSslMode(`postgresql://u:p@host.neon.tech/db?sslmode=${mode}&channel_binding=require`)
    const params = new URL(url).searchParams
    expect(params.get('sslmode')).toBe('verify-full')
    expect(params.get('channel_binding')).toBe('require')
  })

  it.each([
    'postgresql://u:p@localhost:5432/db',
    'postgresql://u:p@host/db?sslmode=disable',
    'postgresql://u:p@host/db?sslmode=verify-full',
    'postgresql://u:p@host/db?uselibpqcompat=true&sslmode=require',
    'not a url',
  ])('leaves %s unchanged', (input) => {
    expect(withExplicitSslMode(input)).toBe(input)
  })

  it('keeps credentials with special characters intact', () => {
    const input = 'postgresql://user:p%40ss%2Fword@host/db?sslmode=require'
    const url = new URL(withExplicitSslMode(input))
    expect(url.password).toBe('p%40ss%2Fword')
    expect(url.searchParams.get('sslmode')).toBe('verify-full')
  })
})
