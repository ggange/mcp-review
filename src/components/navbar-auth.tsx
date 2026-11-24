'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarMenu } from '@/components/avatar-menu'

/**
 * Session-dependent part of the navbar. Rendered on the client so the shared
 * layout never reads cookies on the server, which would make every page
 * dynamic and uncacheable.
 */
export function NavbarAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Skeleton className="h-8 w-8 rounded-full" />
  }

  if (session?.user) {
    return (
      <AvatarMenu
        user={session.user}
        signOutAction={async () => {
          await signOut({ redirectTo: '/' })
        }}
      />
    )
  }

  return (
    <Link href="/auth/signin">
      <Button className="bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600">
        Sign in
      </Button>
    </Link>
  )
}

/**
 * "Submit a Server" target: the upload dialog when signed in, sign-in otherwise
 */
export function useSubmitServerHref(): string {
  const { data: session } = useSession()
  return session?.user
    ? '/dashboard?upload=true'
    : '/auth/signin?callbackUrl=' + encodeURIComponent('/dashboard?upload=true')
}
