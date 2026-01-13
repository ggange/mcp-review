import { signIn } from '@/lib/auth'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignInForm } from '@/components/signin-form'

const hasGitHub = !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET)

export const metadata: Metadata = {
  title: 'Sign In - MCP Review',
  description: 'Sign in to MCP Review to upload, rate, and review Model Context Protocol servers',
  robots: {
    index: false,
    follow: false,
  },
}

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const callbackUrl = params.callbackUrl || '/'
  const hasProviders = hasGitHub

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
      <Card className="w-full max-w-md border-border bg-card backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-card-foreground">
            Sign in to MCP Review
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Upload, rate and review MCP servers. <br /> We require a GitHub account to limit abuse and give you the most fair experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasProviders ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                OAuth is not configured for development.
              </p>
              <p className="text-sm text-muted-foreground/70">
                To enable authentication, add GITHUB_ID and GITHUB_SECRET to your .env file.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-4">
                You can still browse servers without signing in.
              </p>
            </div>
          ) : (
            <>
              {hasGitHub && (
                <SignInForm callbackUrl={callbackUrl} />
              )}
              
              <p className="text-center text-sm text-muted-foreground/70 mt-6">
                By signing in, you agree to our terms of service
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

