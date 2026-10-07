import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateRatingBadge } from '../badge'
import { BADGE_EXAMPLES, BADGE_EXAMPLES_DIR } from '../badge-examples'

describe('README badge examples', () => {
  it.each(BADGE_EXAMPLES)('$file matches the current badge renderer', ({ file, data }) => {
    const committed = readFileSync(join(process.cwd(), BADGE_EXAMPLES_DIR, file), 'utf-8')

    // If this fails after changing the badge design, run `npm run badges:examples`
    expect(committed).toBe(generateRatingBadge(data) + '\n')
  })
})
