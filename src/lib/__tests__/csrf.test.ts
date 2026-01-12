import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateOrigin, normalizeOrigin, getAllowedOrigins, csrfErrorResponse } from '../csrf'

describe('normalizeOrigin', () => {
  it('removes trailing slash', () => {
    expect(normalizeOrigin('https://example.com/')).toBe('https://example.com')
  })

  it('keeps origin without trailing slash unchanged', () => {
    expect(normalizeOrigin('https://example.com')).toBe('https://example.com')
  })

  it('handles multiple trailing slashes', () => {
    expect(normalizeOrigin('https://example.com///')).toBe('https://example.com//')
  })

  it('handles empty string', () => {
    expect(normalizeOrigin('')).toBe('')
  })
})

describe('getAllowedOrigins', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  it('includes NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/'
    const origins = getAllowedOrigins()
    
    expect(origins).toContain('https://example.com')
  })

  it('includes NEXTAUTH_URL when set', () => {
    process.env.NEXTAUTH_URL = 'https://auth.example.com/'
    const origins = getAllowedOrigins()
    
    expect(origins).toContain('https://auth.example.com')
  })

  it('includes VERCEL_URL when set', () => {
    process.env.VERCEL_URL = 'my-app.vercel.app'
    const origins = getAllowedOrigins()
    
    expect(origins).toContain('https://my-app.vercel.app')
  })

  it('includes VERCEL_PROJECT_PRODUCTION_URL when set', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'my-app.com'
    const origins = getAllowedOrigins()
    
    expect(origins).toContain('https://my-app.com')
  })

  it('includes localhost in development', () => {
    process.env.NODE_ENV = 'development'
    const origins = getAllowedOrigins()
    
    expect(origins).toContain('http://localhost:3000')
    expect(origins).toContain('http://127.0.0.1:3000')
  })

  it('does not include localhost in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.VERCEL_URL
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    
    const origins = getAllowedOrigins()
    
    expect(origins).not.toContain('http://localhost:3000')
    expect(origins).not.toContain('http://127.0.0.1:3000')
  })

  it('removes duplicate origins', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    process.env.NEXTAUTH_URL = 'https://example.com'
    
    const origins = getAllowedOrigins()
    const uniqueOrigins = [...new Set(origins)]
    
    expect(origins.length).toBe(uniqueOrigins.length)
  })

  it('normalizes trailing slashes from env vars', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/'
    process.env.NEXTAUTH_URL = 'https://auth.example.com/'
    
    const origins = getAllowedOrigins()
    
    expect(origins).toContain('https://example.com')
    expect(origins).not.toContain('https://example.com/')
  })
})

describe('validateOrigin', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  it('skips validation for GET requests', () => {
    const request = new Request('https://example.com/api', {
      method: 'GET',
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('skips validation for HEAD requests', () => {
    const request = new Request('https://example.com/api', {
      method: 'HEAD',
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('skips validation for OPTIONS requests', () => {
    const request = new Request('https://example.com/api', {
      method: 'OPTIONS',
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('validates POST requests in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        origin: 'https://example.com',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('rejects POST requests with invalid origin in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        origin: 'https://evil.com',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid request origin')
  })

  it('uses referer when origin is missing in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        referer: 'https://example.com/page',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('rejects when both origin and referer are missing in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Missing origin header')
  })

  it('rejects invalid referer URL in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        referer: 'not-a-valid-url',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid referer header')
  })

  it('allows all origins in development for POST', () => {
    process.env.NODE_ENV = 'development'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        origin: 'https://any-origin.com',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('normalizes origin before comparison', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        origin: 'https://example.com/',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('validates PATCH requests', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'PATCH',
      headers: {
        origin: 'https://example.com',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('validates DELETE requests', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'DELETE',
      headers: {
        origin: 'https://example.com',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })

  it('handles case-insensitive HTTP methods', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    
    const request = new Request('https://example.com/api', {
      method: 'post', // lowercase
      headers: {
        origin: 'https://example.com',
      },
    })
    
    const result = validateOrigin(request)
    
    expect(result.isValid).toBe(true)
  })
})

describe('csrfErrorResponse', () => {
  it('returns correct error structure', () => {
    const response = csrfErrorResponse()
    
    expect(response).toEqual({
      error: {
        code: 'CSRF_ERROR',
        message: 'Invalid request origin. This may be a cross-site request forgery attempt.',
      },
    })
  })
})
