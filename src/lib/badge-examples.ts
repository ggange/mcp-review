import type { RatingBadgeData } from './badge'

/**
 * Sample badges rendered into docs/badges/ for the README.
 * Regenerate with `npm run badges:examples`; a test fails if they drift.
 */
export const BADGE_EXAMPLES: Array<{ file: string; caption: string; data: RatingBadgeData }> = [
  { file: 'rated.svg', caption: 'With reviews', data: { avgRating: 4.6, totalRatings: 128 } },
  { file: 'rated-compact.svg', caption: 'Compact (?totals=false)', data: { avgRating: 4.6, totalRatings: 128, showTotals: false } },
  { file: 'no-reviews.svg', caption: 'No reviews yet', data: { avgRating: 0, totalRatings: 0 } },
  { file: 'no-reviews-invite.svg', caption: 'Custom invitation (?text=...)', data: { avgRating: 0, totalRatings: 0, noRatingsText: 'Review us on mcpreview.dev' } },
]

export const BADGE_EXAMPLES_DIR = 'docs/badges'
