import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { badgeDataUri, generateRatingBadge } from '@/lib/badge'

/**
 * Homepage call-to-action inviting server maintainers to add a README badge
 */
export function BadgePromo() {
  return (
    <section aria-labelledby="badge-promo-title">
      <Card className="border-violet-200 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/5">
        <CardContent className="flex flex-col items-center gap-4 p-5 text-center md:flex-row md:gap-6 md:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG badge example */}
          <img
            src={badgeDataUri(generateRatingBadge({ avgRating: 4.6, totalRatings: 128 }))}
            alt="Example MCP Review badge: rated 4.6 out of 5 from 128 reviews"
            height={20}
            className="h-6 w-auto max-w-full shrink-0 object-contain"
          />
          <div className="flex-1">
            <h2 id="badge-promo-title" className="font-semibold text-foreground">
              Maintain an MCP server? Put its rating in your README.
            </h2>
            <p className="text-sm text-muted-foreground">
              A live badge shows your score and invites users to review you. Copy one snippet; it updates by itself.
            </p>
          </div>
          <Button asChild className="shrink-0 bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600">
            <Link href="/badges">Get your badge</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
