'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSubmitServerHref } from '@/components/navbar-auth'

export function SubmitServerButton() {
  const href = useSubmitServerHref()
  return (
    <Link href={href}>
      <Button size="lg" className="h-11 px-6 text-base font-semibold bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600 shadow-sm transition-all hover:scale-105">
        Submit a Server
      </Button>
    </Link>
  )
}
