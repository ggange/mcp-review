// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, string>()
const setex = vi.fn(async (key: string, _ttl: number, value: string) => {
  store.set(key, value)
})

vi.mock('../redis', () => ({
  getRedisClient: () => ({
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex,
    del: vi.fn(async (...keys: string[]) => keys.forEach((k) => store.delete(k))),
  }),
}))

import { getOrSetCache, invalidateServerCache, serverDetailCacheKey } from '../cache'

describe('getOrSetCache', () => {
  beforeEach(() => {
    store.clear()
    setex.mockClear()
  })

  it('loads once, then serves from the cache', async () => {
    const load = vi.fn(async () => ({ id: 'a' }))
    expect(await getOrSetCache('k', 600, load)).toEqual({ id: 'a' })
    expect(await getOrSetCache('k', 600, load)).toEqual({ id: 'a' })
    expect(load).toHaveBeenCalledOnce()
    expect(setex).toHaveBeenCalledWith('cache:k', 600, expect.any(String))
  })

  it('caches misses only when missTtl is given, using that TTL', async () => {
    const load = vi.fn(async () => null)
    await getOrSetCache('nope', 600, load)
    await getOrSetCache('nope', 600, load)
    expect(load).toHaveBeenCalledTimes(2)

    await getOrSetCache('miss', 600, load, { missTtl: 60 })
    await getOrSetCache('miss', 600, load, { missTtl: 60 })
    expect(load).toHaveBeenCalledTimes(3)
    expect(setex).toHaveBeenCalledWith('cache:miss', 60, expect.any(String))
  })

  it('invalidateServerCache drops the cached detail', async () => {
    const load = vi.fn(async () => ({ id: 'org/srv' }))
    await getOrSetCache(serverDetailCacheKey('org/srv'), 600, load)
    await invalidateServerCache('org/srv')
    await getOrSetCache(serverDetailCacheKey('org/srv'), 600, load)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
