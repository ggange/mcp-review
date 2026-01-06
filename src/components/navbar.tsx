import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeSwitcher } from '@/components/theme-switcher'

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="text-xl font-semibold text-foreground">MCP Review</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/about">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Our Mission
            </Button>
          </Link>
          <ThemeSwitcher />
          {session?.user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  My Ratings
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <form
                  action={async () => {
                    'use server'
                    await signOut({ redirectTo: '/' })
                  }}
                >
                  <Button variant="ghost" type="submit" className="text-muted-foreground hover:text-foreground">
                    Sign out
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

