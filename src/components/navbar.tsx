import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="text-xl font-semibold text-slate-100">MCP Marketplace</span>
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-slate-300 hover:text-slate-100">
                  My Ratings
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
                  <AvatarFallback className="bg-slate-700 text-slate-300">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <form
                  action={async () => {
                    'use server'
                    await signOut({ redirectTo: '/' })
                  }}
                >
                  <Button variant="ghost" type="submit" className="text-slate-400 hover:text-slate-100">
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

