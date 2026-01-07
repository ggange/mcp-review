import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { AvatarMenu } from '@/components/avatar-menu'

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <span className="text-lg font-bold text-white">M</span>
            </div>
            <span className="text-xl font-semibold text-foreground">MCP Review</span>
          </Link>
          <ThemeSwitcher />
        </div>

        <div className="flex items-center gap-4">
          <Link href="/about">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Our Mission
            </Button>
          </Link>
          {session?.user ? (
            <AvatarMenu
              user={session.user}
              signOutAction={async () => {
                'use server'
                await signOut({ redirectTo: '/' })
              }}
            />
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

