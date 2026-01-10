import { Skeleton } from '@/components/ui/skeleton'

export function NavbarSkeleton() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Logo placeholder */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <span className="text-lg font-bold text-white">M</span>
            </div>
            <span className="text-xl font-semibold text-foreground">MCP Review</span>
          </div>
          {/* Theme switcher placeholder */}
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>

        <div className="flex items-center gap-4">
          {/* GitHub button placeholder */}
          <Skeleton className="h-9 w-24 rounded-full" />
          {/* About button placeholder */}
          <Skeleton className="h-9 w-20 rounded-md" />
          {/* Sign in button placeholder */}
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </nav>
  )
}
