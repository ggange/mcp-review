import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-6 h-6 w-32" />
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
          
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
