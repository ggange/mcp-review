'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service (e.g., Sentry, LogRocket)
      console.error('Application error:', error)
    } else {
      console.error('Application error:', error)
    }
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV !== 'production' && error.message && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-mono text-muted-foreground">{error.message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => (window.location.href = '/')} variant="outline">
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
