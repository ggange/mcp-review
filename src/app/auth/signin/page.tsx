import { signIn } from '@/lib/auth'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
                <form
                  action={async (formData: FormData) => {
                    'use server'
                    const redirectTo = formData.get('callbackUrl') as string || '/'
                    await signIn('github', { redirectTo })
                  }}
                >
                  <input type="hidden" name="callbackUrl" value={callbackUrl} />
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full h-12 text-base border-border hover:bg-muted hover:text-foreground"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                  </Button>
                </form>
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

