/**
 * README badge generation (shields.io-style flat SVG)
 *
 * Pure functions with no Node.js dependencies so they can be used both by the
 * badge API route and by client components that build embed snippets.
 */

export const BADGE_LABEL = 'MCP Review'
export const DEFAULT_NO_RATINGS_TEXT = 'be the first to review'
export const MAX_CUSTOM_TEXT_LENGTH = 50

const COLORS = {
  label: '#555',
  rated: '#7c3aed',
  unrated: '#8b5cf6',
  notFound: '#9f9f9f',
  error: '#e05d44',
} as const

const HEIGHT = 20
const LOGO_SIZE = 14
const LOGO_PADDING = 5
const TEXT_PADDING = 6
const FONT_FAMILY = 'Verdana,Geneva,DejaVu Sans,sans-serif'

/**
 * Approximate glyph widths for Verdana 11px (the font shields.io badges use).
 * Text elements also get a `textLength`, so small estimation errors are
 * absorbed by the renderer instead of overflowing the badge.
 */
const CHAR_WIDTHS: Record<string, number> = {
  ' ': 3.87, '!': 4.33, '"': 5.05, '#': 9.01, '$': 7, '%': 11.84, '&': 7.99, "'": 2.95,
  '(': 4.99, ')': 4.99, '*': 7, '+': 9.01, ',': 4, '-': 4.99, '.': 4, '/': 4.99,
  ':': 4.99, ';': 4.99, '<': 9.01, '=': 9.01, '>': 9.01, '?': 6, '@': 11,
  A: 7.52, B: 7.58, C: 7.68, D: 8.48, E: 6.96, F: 6.32, G: 8.53, H: 8.27, I: 4.63,
  J: 5, K: 7.62, L: 6.12, M: 9.27, N: 8.23, O: 8.66, P: 6.63, Q: 8.66, R: 7.65,
  S: 7.52, T: 6.78, U: 8.05, V: 7.52, W: 10.87, X: 7.54, Y: 6.77, Z: 7.54,
  '[': 4.99, '\\': 4.99, ']': 4.99, '^': 9.01, _: 7, '`': 7,
  a: 6.61, b: 6.85, c: 5.73, d: 6.85, e: 6.55, f: 3.87, g: 6.85, h: 6.96, i: 3.02,
  j: 3.79, k: 6.51, l: 3.02, m: 10.7, n: 6.96, o: 6.68, p: 6.85, q: 6.85, r: 4.69,
  s: 5.73, t: 4.33, u: 6.96, v: 6.51, w: 8.98, x: 6.51, y: 6.51, z: 5.78,
  '{': 6.98, '|': 4.99, '}': 6.98, '~': 9.01, '·': 6.3,
}
const DIGIT_WIDTH = 7
const FALLBACK_WIDTH = 7.5

export function measureText(text: string): number {
  let width = 0
  for (const char of text) {
    width += /\d/.test(char) ? DIGIT_WIDTH : CHAR_WIDTHS[char] ?? FALLBACK_WIDTH
  }
  return Math.round(width * 10) / 10
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Normalize the user-supplied `text` query parameter.
 * Returns null when nothing usable remains, so callers fall back to the default.
 */
export function sanitizeCustomText(text: string | null | undefined): string | null {
  if (!text) return null
  const cleaned = text
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  // Slice by code point so emoji and other astral characters are never split
  return Array.from(cleaned).slice(0, MAX_CUSTOM_TEXT_LENGTH).join('').trim()
}

const STAR_SIZE = 10
const STAR_GAP = 1.5
const STAR_COUNT = 5
const STARS_WIDTH = STAR_COUNT * STAR_SIZE + (STAR_COUNT - 1) * STAR_GAP
const STARS_TEXT_GAP = 5
const STAR_FILL = '#fde047'

/** Points for a five-pointed star inscribed in a STAR_SIZE box at (x, y). */
function starPoints(x: number, y: number): string {
  const center = STAR_SIZE / 2
  const outer = STAR_SIZE / 2
  const inner = outer * 0.45
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    points.push(`${round(x + center + radius * Math.cos(angle))},${round(y + center + radius * Math.sin(angle))}`)
  }
  return points.join(' ')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Width of the filled part of the star row for a 0-5 rating, skipping the gaps. */
function starFillWidth(rating: number): number {
  const clamped = Math.min(Math.max(rating, 0), STAR_COUNT)
  const full = Math.floor(clamped)
  const partial = clamped - full
  return round(full * (STAR_SIZE + STAR_GAP) + partial * STAR_SIZE)
}

function renderStars(x: number, rating: number): string {
  const y = (HEIGHT - STAR_SIZE) / 2
  const stars = Array.from({ length: STAR_COUNT }, (_, i) =>
    `<polygon points="${starPoints(x + i * (STAR_SIZE + STAR_GAP), y)}"/>`
  ).join('')
  return `<clipPath id="fill"><rect x="${x}" y="0" width="${starFillWidth(rating)}" height="${HEIGHT}"/></clipPath>` +
    `<g fill="#fff" fill-opacity=".35">${stars}</g>` +
    `<g fill="${STAR_FILL}" clip-path="url(#fill)">${stars}</g>`
}

interface RenderOptions {
  label: string
  message: string
  color: string
  /** 0-5 rating drawn as a row of stars before the message */
  stars?: number
  /** Accessible description; defaults to "label: message" */
  description?: string
}

/**
 * Render a flat two-part badge: [logo + label | (stars) message]
 */
export function renderBadge({ label, message, color, stars, description }: RenderOptions): string {
  const labelTextWidth = measureText(label)
  const messageTextWidth = measureText(message)
  const starsWidth = stars === undefined ? 0 : STARS_WIDTH + STARS_TEXT_GAP

  const labelWidth = Math.round(LOGO_PADDING + LOGO_SIZE + 4 + labelTextWidth + TEXT_PADDING)
  const messageWidth = Math.round(TEXT_PADDING + starsWidth + messageTextWidth + TEXT_PADDING)
  const totalWidth = labelWidth + messageWidth

  const labelX = LOGO_PADDING + LOGO_SIZE + 4 + labelTextWidth / 2
  const messageX = labelWidth + TEXT_PADDING + starsWidth + messageTextWidth / 2

  const safeLabel = escapeXml(label)
  const safeMessage = escapeXml(message)
  const title = escapeXml(description ?? `${label}: ${message}`)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${HEIGHT}" role="img" aria-label="${title}">` +
    `<title>${title}</title>` +
    `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>` +
    `<linearGradient id="logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#d946ef"/></linearGradient>` +
    `<clipPath id="r"><rect width="${totalWidth}" height="${HEIGHT}" rx="3" fill="#fff"/></clipPath>` +
    `<g clip-path="url(#r)">` +
    `<rect width="${labelWidth}" height="${HEIGHT}" fill="${COLORS.label}"/>` +
    `<rect x="${labelWidth}" width="${messageWidth}" height="${HEIGHT}" fill="${color}"/>` +
    `<rect width="${totalWidth}" height="${HEIGHT}" fill="url(#s)"/>` +
    `</g>` +
    `<rect x="${LOGO_PADDING}" y="${(HEIGHT - LOGO_SIZE) / 2}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="3" fill="url(#logo)"/>` +
    `<text x="${LOGO_PADDING + LOGO_SIZE / 2}" y="13.5" fill="#fff" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="10" font-weight="bold" aria-hidden="true">M</text>` +
    (stars === undefined ? '' : renderStars(labelWidth + TEXT_PADDING, stars)) +
    `<g fill="#fff" text-anchor="middle" font-family="${FONT_FAMILY}" text-rendering="geometricPrecision" font-size="11" aria-hidden="true">` +
    `<text x="${labelX}" y="15" fill="#010101" fill-opacity=".3" textLength="${labelTextWidth}">${safeLabel}</text>` +
    `<text x="${labelX}" y="14" textLength="${labelTextWidth}">${safeLabel}</text>` +
    `<text x="${round(messageX)}" y="15" fill="#010101" fill-opacity=".3" textLength="${messageTextWidth}">${safeMessage}</text>` +
    `<text x="${round(messageX)}" y="14" textLength="${messageTextWidth}">${safeMessage}</text>` +
    `</g></svg>`
}

export interface RatingBadgeData {
  avgRating: number | null
  totalRatings: number
  /** Include the number of reviews, e.g. "4.5 · 12 reviews". Defaults to true. */
  showTotals?: boolean
  /** Message shown while the server has no ratings. */
  noRatingsText?: string | null
}

/** 950 -> "950", 1234 -> "1.2k", 25000 -> "25k" */
export function formatCount(count: number): string {
  if (count < 1000) return String(count)
  const thousands = count / 1000
  return `${thousands < 10 ? Math.floor(thousands * 10) / 10 : Math.floor(thousands)}k`
}

export interface RatingSummary {
  /** Text shown in the message half of the badge */
  message: string
  /** Rating for the star row, or null when there are no ratings yet */
  stars: number | null
  /** Accessible description of the badge */
  description: string
}

export function getRatingSummary({ avgRating, totalRatings, showTotals = true, noRatingsText }: RatingBadgeData): RatingSummary {
  if (!totalRatings || totalRatings <= 0 || !avgRating || avgRating <= 0) {
    const message = noRatingsText || DEFAULT_NO_RATINGS_TEXT
    return { message, stars: null, description: `${BADGE_LABEL}: no reviews yet` }
  }
  const rating = avgRating.toFixed(1)
  const reviews = `${formatCount(totalRatings)} ${totalRatings === 1 ? 'review' : 'reviews'}`
  return {
    message: showTotals ? `${rating} · ${reviews}` : rating,
    stars: avgRating,
    description: `${BADGE_LABEL}: rated ${rating} out of 5 from ${totalRatings} ${totalRatings === 1 ? 'review' : 'reviews'}`,
  }
}

export function generateRatingBadge(data: RatingBadgeData): string {
  const { message, stars, description } = getRatingSummary(data)
  return renderBadge({
    label: BADGE_LABEL,
    message,
    stars: stars ?? undefined,
    description,
    color: stars === null ? COLORS.unrated : COLORS.rated,
  })
}

export function generateNotFoundBadge(): string {
  return renderBadge({ label: BADGE_LABEL, message: 'server not found', color: COLORS.notFound })
}

export function generateErrorBadge(): string {
  return renderBadge({ label: BADGE_LABEL, message: 'unavailable', color: COLORS.error })
}

/** Inline a badge SVG as an <img> source, e.g. for examples that need no request */
export function badgeDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Suggested no-reviews message inviting visitors to review on this site */
export function getReviewInvitation(baseUrl: string): string {
  return `Review us on ${new URL(baseUrl).host}`
}

/**
 * Build the badge image URL, the server page URL, and ready-to-paste embed
 * snippets for a server. Server IDs may contain a slash (organization/name),
 * which maps onto the badge route's catch-all segments.
 * `text` sets the message shown until the server's first review.
 */
export function getBadgeEmbed(baseUrl: string, serverId: string, options: { text?: string | null } = {}) {
  const origin = baseUrl.replace(/\/$/, '')
  const badgePath = serverId.split('/').map(encodeURIComponent).join('/')
  const text = sanitizeCustomText(options.text)
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  const imageUrl = `${origin}/api/badge/${badgePath}${query}`
  const pageUrl = `${origin}/servers/${encodeURIComponent(serverId)}`

  return {
    imageUrl,
    pageUrl,
    markdown: `[![${BADGE_LABEL}](${imageUrl})](${pageUrl})`,
    html: `<a href="${escapeXml(pageUrl)}"><img src="${escapeXml(imageUrl)}" alt="${BADGE_LABEL}" /></a>`,
  }
}
