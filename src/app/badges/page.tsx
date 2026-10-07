import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { JsonLdScript } from '@/components/json-ld-script'
import { badgeDataUri, generateRatingBadge } from '@/lib/badge'
import { BADGE_EXAMPLES } from '@/lib/badge-examples'
import { ServerBadgeResults } from '@/components/server/server-badge-results'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  title: 'README Rating Badges for MCP Servers - MCP Review',
  description: 'Add a live MCP Review badge to your MCP server README. It shows your community rating and review count, and invites users to leave a review.',
  openGraph: {
    title: 'README Rating Badges for MCP Servers',
    description: 'Show your MCP server\'s community rating in your README with a live, auto-updating badge.',
    url: `${baseUrl}/badges`,
    type: 'website',
  },
  alternates: {
    canonical: `${baseUrl}/badges`,
  },
}

interface BadgesPageProps {
  searchParams: Promise<{ q?: string }>
}

const STEPS = [
  { title: 'Find your server', body: 'Search below, or submit it if it is not listed yet.' },
  { title: 'Copy the snippet', body: 'Its page has a README Badge card with Markdown and HTML ready to paste.' },
  { title: 'Collect reviews', body: 'The badge updates within minutes of every new review. Nothing to maintain.' },
]

export default async function BadgesPage({ searchParams }: BadgesPageProps) {
  const { q } = await searchParams
  const query = q?.trim().slice(0, 100) || ''

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'README Badges', item: `${baseUrl}/badges` },
    ],
  }

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} id="breadcrumb-schema" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Show your rating in your <span className="text-violet-600 dark:text-violet-400">README</span>
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            A live MCP Review badge tells visitors how the community rates your MCP server, and links them
            straight to where they can add their own review.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG badge example */}
          <img
            src={badgeDataUri(generateRatingBadge(BADGE_EXAMPLES[0].data))}
            alt="Example MCP Review badge: rated 4.6 out of 5 from 128 reviews"
            height={20}
            className="mx-auto h-7 w-auto max-w-full object-contain"
          />
        </header>

        <section aria-labelledby="find-title">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle id="find-title" className="text-card-foreground">Find your server</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action="/badges" method="get" role="search" className="flex gap-2">
                <label htmlFor="badge-search" className="sr-only">Server name or organization</label>
                <Input
                  id="badge-search"
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Server name or organization"
                  maxLength={100}
                  autoFocus={!query}
                />
                <Button type="submit" className="bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600">
                  Search
                </Button>
              </form>
              {query && <ServerBadgeResults query={query} baseUrl={baseUrl} />}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="steps-title" className="space-y-4">
          <h2 id="steps-title" className="text-xl font-semibold text-foreground">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-lg border border-border p-4">
                <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  {index + 1}
                </span>
                <h3 className="font-medium text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="variants-title" className="space-y-4">
          <h2 id="variants-title" className="text-xl font-semibold text-foreground">What it looks like</h2>
          <ul className="space-y-3">
            {BADGE_EXAMPLES.map((example) => (
              <li key={example.file} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG badge example */}
                <img
                  src={badgeDataUri(generateRatingBadge(example.data))}
                  alt={`Badge example: ${example.caption}`}
                  height={20}
                  className="h-5 w-auto max-w-full self-start object-contain object-left"
                />
                <span className="text-sm text-muted-foreground">{example.caption}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Until your first review the badge invites visitors to leave one. You can change that message on
            your server&apos;s page. Full options are in the{' '}
            <a
              href="https://github.com/ggange/mcp-review#-badge-integration"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              documentation
            </a>
            .
          </p>
        </section>
      </div>
    </>
  )
}
