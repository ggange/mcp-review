import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ServerCardSkeleton() {
  return (
    <Card className="h-full border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-lg bg-slate-700" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 bg-slate-700" />
            <Skeleton className="h-4 w-1/2 bg-slate-700" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-full bg-slate-700" />
          <Skeleton className="h-4 w-2/3 bg-slate-700" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24 bg-slate-700" />
          <Skeleton className="h-5 w-16 bg-slate-700" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ServerGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ServerCardSkeleton key={i} />
      ))}
    </div>
  )
}

