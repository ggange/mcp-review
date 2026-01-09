/**
 * Script to generate a static OG image for MCP Review
 * Run with: node scripts/generate-og-image.mjs
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Create an SVG that matches our design
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6"/>
      <stop offset="100%" style="stop-color:#d946ef"/>
    </linearGradient>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a78bfa"/>
      <stop offset="100%" style="stop-color:#e879f9"/>
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="10" stdDeviation="30" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Icon container -->
  <g filter="url(#shadow)">
    <rect x="500" y="100" width="200" height="200" rx="48" fill="url(#iconGrad)"/>
    <rect x="500" y="100" width="200" height="200" rx="48" stroke="rgba(255,255,255,0.2)" stroke-width="4" fill="none"/>
  </g>
  
  <!-- M letter -->
  <text x="600" y="220" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="120" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">M</text>
  
  <!-- Title -->
  <text x="600" y="380" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="700" fill="white" text-anchor="middle">MCP Review</text>
  
  <!-- Subtitle -->
  <text x="600" y="450" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="middle">Discover, Rate, and Review Model Context Protocol Servers</text>
</svg>`

// Write SVG file (useful for editing)
const svgPath = join(__dirname, '..', 'public', 'og-image.svg')
writeFileSync(svgPath, svg)
console.log('✓ Generated og-image.svg')

console.log('')
console.log('To convert to PNG, run one of these commands:')
console.log('')
console.log('  Using Inkscape:')
console.log('    inkscape public/og-image.svg -o public/og-image.png -w 1200 -h 630')
console.log('')
console.log('  Using ImageMagick:')
console.log('    convert -background none -density 150 public/og-image.svg public/og-image.png')
console.log('')
console.log('  Using rsvg-convert (librsvg):')
console.log('    rsvg-convert -w 1200 -h 630 public/og-image.svg -o public/og-image.png')
console.log('')
console.log('  Or use an online converter like https://svgtopng.com/')
console.log('')
