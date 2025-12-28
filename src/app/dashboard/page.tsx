import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const ratings = await prisma.rating.findMany({
    where: { userId: session.user.id },
    include: {
      server: {
        select: {
          id: true,
          name: true,
          organization: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">My Ratings</h1>
        <p className="mt-2 text-slate-400">
          View and manage your server ratings
        </p>
      </div>

      {ratings.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="py-12 text-center">
            <div className="mb-4 inline-block rounded-full bg-slate-800 p-4">
              <svg
                className="h-8 w-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-300">No ratings yet</h3>
            <p className="mt-1 text-slate-500">
              Start by exploring servers and leaving your first rating
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-violet-400 hover:text-violet-300"
            >
              Browse servers →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ratings.map((rating) => (
            <Link key={rating.id} href={`/servers/${encodeURIComponent(rating.server.id)}`}>
              <Card className="h-full cursor-pointer border-slate-700 bg-slate-800/50 transition-all hover:border-slate-600 hover:bg-slate-800/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-slate-100">
                    {rating.server.name}
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    by {rating.server.organization}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trustworthiness</span>
                      <span className="font-medium text-slate-300">
                        {rating.trustworthiness}/5
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Usefulness</span>
                      <span className="font-medium text-slate-300">
                        {rating.usefulness}/5
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Updated {rating.updatedAt.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

