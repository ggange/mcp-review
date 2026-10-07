import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit } from '../rate-limit'

const evalMock = vi.fn()

vi.mock('../redis', () => ({
  isRedisAvailable: vi.fn(async () => true),
  getRedisClient: vi.fn(() => ({ eval: evalMock })),
}))

describe('checkRateLimit (Redis)', () => {
  beforeEach(() => {
    evalMock.mockReset()
  })

  it('increments and sets the expiry in a single atomic script call', async () => {
    evalMock.mockResolvedValue([1, 60000])

    const result = await checkRateLimit('user-1:ratings', 10, 60000)

    expect(evalMock).toHaveBeenCalledOnce()
    const [script, numKeys, key, windowMs] = evalMock.mock.calls[0]
    expect(script).toContain('INCR')
    expect(script).toContain('PEXPIRE')
    expect(numKeys).toBe(1)
    expect(key).toBe('ratelimit:user-1:ratings')
    expect(windowMs).toBe(60000)
    expect(result).toEqual({ allowed: true, remaining: 9, resetIn: 60000 })
  })

  it('blocks once the count exceeds the limit and reports the remaining TTL', async () => {
    evalMock.mockResolvedValue([11, 12500])

    const result = await checkRateLimit('user-1:ratings', 10, 60000)

    expect(result).toEqual({ allowed: false, remaining: 0, resetIn: 12500 })
  })

  it('falls back to in-memory limiting when the Redis call fails', async () => {
    evalMock.mockRejectedValue(new Error('connection lost'))

    const result = await checkRateLimit('user-2:ratings', 10, 60000)

    expect(result).toEqual({ allowed: true, remaining: 9, resetIn: 60000 })
  })
})
