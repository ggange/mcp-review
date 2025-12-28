import { ServerCard } from './server-card'
import type { ServerWithRatings } from '@/types'
import type { ReactNode } from 'react'

interface ServerGridProps {
  servers: ServerWithRatings[]
  pagination?: ReactNode
}

export function ServerGrid({ servers, pagination }: ServerGridProps) {
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg
            className="h-8 w-8 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground">No servers found</h3>
        <p className="mt-1 text-muted-foreground/70">Try adjusting your search terms or category filter</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>
      {pagination}
    </>
  )
}

