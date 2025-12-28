import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RatingDisplay } from './rating-display'
import type { ServerWithRatings } from '@/types'

interface ServerCardProps {
  server: ServerWithRatings
}

// Generate a consistent color based on the server name
function getAvatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
    'from-indigo-500 to-blue-500',
    'from-fuchsia-500 to-pink-500',
    'from-cyan-500 to-blue-500',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export function ServerCard({ server }: ServerCardProps) {
  const initial = server.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(server.name)

  return (
    <Link href={`/servers/${encodeURIComponent(server.id)}`}>
      <Card className="group h-full cursor-pointer border-slate-700 bg-slate-800/50 transition-all hover:border-slate-600 hover:bg-slate-800/80">
        <CardHeader className="pb-3 overflow-hidden">
          <div className="flex items-start gap-4">
            {/* Avatar placeholder */}
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor}`}
            >
              <span className="text-xl font-bold text-white">{initial}</span>
            </div>
            
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="truncate text-lg font-semibold text-slate-100 group-hover:text-white">
                {server.name}
              </h3>
              <p className="truncate text-sm text-slate-400">
                by {server.organization}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {server.description ? (
            <p className="mb-4 line-clamp-2 text-sm text-slate-400">
              {server.description}
            </p>
          ) : (
            <p className="mb-4 text-sm italic text-slate-500">
              No description available
            </p>
          )}

          <div className="flex items-center justify-between">
            <RatingDisplay
              trustworthiness={server.avgTrustworthiness}
              usefulness={server.avgUsefulness}
              totalRatings={server.totalRatings}
              compact
            />
            
            <div className="flex gap-2">
              {server.isOfficial && (
                <Badge variant="secondary" className="bg-violet-500/20 text-violet-300">
                  Official
                </Badge>
              )}
              {server.version && (
                <Badge variant="outline" className="border-slate-600 text-slate-400">
                  v{server.version}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

