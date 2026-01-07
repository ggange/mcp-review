/**
 * CSRF Protection via Origin header validation
 * 
 * This provides protection against Cross-Site Request Forgery attacks by
 * verifying that mutation requests originate from the same origin.
 */

/**
 * Get the allowed origins for CSRF validation
 * In production, this should be explicitly set via environment variable
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = []
  
  // Add production URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL)
  }
  
  // Add Vercel deployment URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }
  
  // In development, allow localhost
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000')
    origins.push('http://127.0.0.1:3000')
  }
  
  return origins
}

/**
 * Validate that the request origin is allowed
 * 
 * @param request - The incoming request
 * @returns Object with isValid boolean and optional error message
 */
export function validateOrigin(request: Request): { isValid: boolean; error?: string } {
  // Skip validation for non-mutation methods (GET, HEAD, OPTIONS)
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { isValid: true }
  }
  
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // In production, require origin header for mutations
  if (process.env.NODE_ENV === 'production') {
    if (!origin) {
      // Some browsers might not send Origin but send Referer
      if (!referer) {
        return { 
          isValid: false, 
          error: 'Missing origin header' 
        }
      }
      // Validate referer instead
      try {
        const refererUrl = new URL(referer)
        const refererOrigin = refererUrl.origin
        const allowedOrigins = getAllowedOrigins()
        
        if (!allowedOrigins.some(allowed => refererOrigin === allowed)) {
          return { 
            isValid: false, 
            error: 'Invalid request origin' 
          }
        }
        return { isValid: true }
      } catch {
        return { 
          isValid: false, 
          error: 'Invalid referer header' 
        }
      }
    }
    
    const allowedOrigins = getAllowedOrigins()
    if (!allowedOrigins.some(allowed => origin === allowed)) {
      return { 
        isValid: false, 
        error: 'Invalid request origin' 
      }
    }
  }
  
  return { isValid: true }
}

/**
 * CSRF validation middleware response
 * Use this in API routes that handle mutations
 */
export function csrfErrorResponse() {
  return {
    error: { 
      code: 'CSRF_ERROR', 
      message: 'Invalid request origin. This may be a cross-site request forgery attempt.' 
    }
  }
}

