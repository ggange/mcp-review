#!/usr/bin/env tsx
/**
 * Render the README example badges into docs/badges/.
 *
 * Usage:
 *   npm run badges:examples
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generateRatingBadge } from '../src/lib/badge'
import { BADGE_EXAMPLES, BADGE_EXAMPLES_DIR } from '../src/lib/badge-examples'

const outDir = join(process.cwd(), BADGE_EXAMPLES_DIR)
mkdirSync(outDir, { recursive: true })

for (const { file, data } of BADGE_EXAMPLES) {
  writeFileSync(join(outDir, file), generateRatingBadge(data) + '\n')
  console.log(`✅ ${BADGE_EXAMPLES_DIR}/${file}`)
}
