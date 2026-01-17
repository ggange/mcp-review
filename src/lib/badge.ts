import { readFileSync } from 'fs'
import { join } from 'path'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { getAvatarColor } from '@/lib/utils'

const DEFAULT_NO_RATINGS_TEXT = 'Available on MCP Review'
const MAX_CUSTOM_TEXT_LENGTH = 50

/**
 * Load badge templates from SVG files
 * Templates are located in a shared templates directory
 */
const templatesDir = join(process.cwd(), 'src/app/api/badge/[id]/templates')

/**
 * Helper function to load template with error handling
 */
function loadTemplate(filename: string): string {
  try {
    return readFileSync(join(templatesDir, filename), 'utf-8')
  } catch (error) {
    console.error(`Failed to load template ${filename}:`, error)
    // Fallback to a simple template if file loading fails
    return `<svg width="200" height="20" viewBox="0 0 200 20">
      <rect width="200" height="20" fill="#8b5cf6" rx="3"/>
      <text x="10" y="14" font-family="system-ui, sans-serif" font-size="11" fill="white">Template Error</text>
    </svg>`
  }
}

/**
 * Template 1: Badge with ratings AND total ratings count
 * Use this when ratings exist and you want to show the total number of ratings
 * Placeholders: {{BRAND_NAME}}, {{RATING_DISPLAY}}, {{TOTAL_RATINGS}}, {{SERVER_NAME}}, {{ICON_URL}}, {{BRAND_LOGO}}
 */
const BADGE_TEMPLATE_WITH_TOTALS = loadTemplate('with-totals.svg')

/**
 * Template 2: Badge with ratings only (no total count)
 * Use this when ratings exist but you don't want to show the total count
 * Placeholders: {{BRAND_NAME}}, {{RATING_DISPLAY}}, {{SERVER_NAME}}, {{ICON_URL}}, {{BRAND_LOGO}}
 */
const BADGE_TEMPLATE_RATINGS_ONLY = loadTemplate('ratings-only.svg')

/**
 * Template 3: Badge without ratings
 * Use this when there are no ratings yet
 * Placeholders: {{BRAND_NAME}}, {{NO_RATINGS_TEXT}}, {{SERVER_NAME}}, {{ICON_URL}}, {{BRAND_LOGO}}
 */
const BADGE_TEMPLATE_NO_RATINGS = loadTemplate('no-ratings.svg')

/**
 * Load brand logo from icon.svg
 * Returns the inner content of the SVG (without the outer svg tag) for embedding
 */
function loadBrandLogo(): string {
  try {
    const iconPath = join(process.cwd(), 'src/app/icon.svg')
    const iconSvg = readFileSync(iconPath, 'utf-8')
    // Extract inner content (everything between <svg> and </svg> tags)
    const match = iconSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
    if (match && match[1]) {
      return match[1].trim()
    }
    // Fallback: return empty string if parsing fails
    return ''
  } catch (error) {
    console.error('Failed to load brand logo:', error)
    return ''
  }
}

const BRAND_LOGO_CONTENT = loadBrandLogo()

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Map Tailwind gradient classes to actual color values for SVG
 */
function getGradientColors(tailwindClass: string): { from: string; to: string } {
  const colorMap: Record<string, { from: string; to: string }> = {
    'from-violet-500 to-purple-600': { from: '#8b5cf6', to: '#9333ea' },
    'from-blue-500 to-cyan-500': { from: '#3b82f6', to: '#06b6d4' },
    'from-emerald-500 to-teal-500': { from: '#10b981', to: '#14b8a6' },
    'from-orange-500 to-amber-500': { from: '#f97316', to: '#f59e0b' },
    'from-rose-500 to-pink-500': { from: '#f43f5e', to: '#ec4899' },
    'from-indigo-500 to-blue-500': { from: '#6366f1', to: '#3b82f6' },
    'from-fuchsia-500 to-pink-500': { from: '#d946ef', to: '#ec4899' },
    'from-cyan-500 to-blue-500': { from: '#06b6d4', to: '#3b82f6' },
  }
  return colorMap[tailwindClass] || colorMap['from-violet-500 to-purple-600']
}

/**
 * Generate an SVG data URI for avatar fallback (matching server card behavior)
 */
function generateAvatarFallback(name: string, size: number = 180): string {
  const initial = name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(name)
  const colors = getGradientColors(avatarColor)
  
  // Don't include xmlns in embedded SVG data URIs to avoid conflicts
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#avatarGradient)" rx="8"/>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${escapeXml(initial)}</text>
</svg>`
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export function sanitizeCustomText(text: string | null): string {
  if (!text) {
    return DEFAULT_NO_RATINGS_TEXT
  }
  const trimmed = text.trim()
  if (trimmed.length > MAX_CUSTOM_TEXT_LENGTH) {
    return trimmed.substring(0, MAX_CUSTOM_TEXT_LENGTH).trim()
  }
  return trimmed
}

function formatRating(rating: number): string {
  return rating.toFixed(1)
}

function generateRatingDisplay(
  hasRatings: boolean,
  avgRating: number | null,
  noRatingsText: string,
  includeTotals: boolean = false,
  totalRatings: number = 0
): string {
  if (!hasRatings || avgRating === null || avgRating === 0) {
    return '' // Empty when no ratings ({{NO_RATINGS_TEXT}} handles the no-ratings message)
  }
  // Include star icon with rating
  const ratingText = `⭐ ${formatRating(avgRating)}`
  // Optionally include total ratings count
  return includeTotals ? `${ratingText} (${totalRatings})` : ratingText
}

/**
 * Selects the appropriate badge template based on ratings and whether to show totals
 */
function selectBadgeTemplate(
  hasRatings: boolean,
  showTotals: boolean = true
): string {
  if (!hasRatings) {
    return BADGE_TEMPLATE_NO_RATINGS
  }
  return showTotals ? BADGE_TEMPLATE_WITH_TOTALS : BADGE_TEMPLATE_RATINGS_ONLY
}

function replacePlaceholders(
  template: string,
  data: {
    avgRating: number | null
    totalRatings: number
    noRatingsText: string
    serverName: string
    brandName?: string
    iconUrl?: string | null
    showTotals?: boolean
  }
): string {
  const hasRatings = data.totalRatings > 0 && data.avgRating !== null && data.avgRating > 0
  const showTotals = data.showTotals ?? true
  const ratingDisplay = generateRatingDisplay(hasRatings, data.avgRating, data.noRatingsText, showTotals, data.totalRatings)
  
  // Generate icon URL or fallback avatar
  const iconUrl = data.iconUrl || generateAvatarFallback(data.serverName)
  
  // Prepare replacement values
  const replacementValues = {
    BRAND_NAME: escapeXml(data.brandName || 'MCP Review'),
    TOTAL_RATINGS: String(data.totalRatings),
    NO_RATINGS_TEXT: hasRatings ? '' : escapeXml(data.noRatingsText),
    SERVER_NAME: escapeXml(data.serverName),
    RATING_DISPLAY: escapeXml(ratingDisplay),
    ICON_URL: iconUrl,
    BRAND_LOGO: BRAND_LOGO_CONTENT
  }
  
  // First, do a simple string replacement on the entire template for non-ICON_URL and non-BRAND_LOGO placeholders
  // Note: ICON_URL and BRAND_LOGO are handled separately (ICON_URL for attributes, BRAND_LOGO for DOM insertion)
  let result = template
    .replace(/\{\{BRAND_NAME\}\}/g, replacementValues.BRAND_NAME)
    .replace(/\{\{TOTAL_RATINGS\}\}/g, replacementValues.TOTAL_RATINGS)
    .replace(/\{\{NO_RATINGS_TEXT\}\}/g, replacementValues.NO_RATINGS_TEXT)
    .replace(/\{\{SERVER_NAME\}\}/g, replacementValues.SERVER_NAME)
    .replace(/\{\{RATING_DISPLAY\}\}/g, replacementValues.RATING_DISPLAY)
    // Don't replace ICON_URL or BRAND_LOGO yet - handle them separately
  
  // Parse SVG using DOMParser to handle placeholders properly
  const parser = new DOMParser()
  const doc = parser.parseFromString(result, 'image/svg+xml')
  
  // Ensure root SVG element has proper namespace attributes (avoid duplicates)
  const rootSvg = doc.documentElement
  if (rootSvg && rootSvg.tagName === 'svg') {
    // Remove all xmlns attributes first to avoid duplicates
    const xmlnsAttrs: Array<{ name: string; value: string; namespace: string | null }> = []
    for (let i = rootSvg.attributes.length - 1; i >= 0; i--) {
      const attr = rootSvg.attributes[i]
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
        xmlnsAttrs.push({ name: attr.name, value: attr.value, namespace: attr.namespaceURI })
        // Remove using both methods to ensure it's gone
        rootSvg.removeAttribute(attr.name)
        if (attr.namespaceURI) {
          rootSvg.removeAttributeNS(attr.namespaceURI, attr.localName || attr.name)
        }
      }
    }
    // Re-add only the first occurrence of each xmlns attribute
    // Set default SVG namespace first
    const seen = new Set<string>()
    for (const attr of xmlnsAttrs) {
      if (!seen.has(attr.name)) {
        // Use setAttribute for xmlns attributes (not setAttributeNS)
        rootSvg.setAttribute(attr.name, attr.value)
        seen.add(attr.name)
      }
    }
    // Ensure default SVG namespace is set if not present
    if (!rootSvg.hasAttribute('xmlns')) {
      rootSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }
    // Ensure xlink namespace is set if we'll be using xlink:href
    if (!rootSvg.hasAttribute('xmlns:xlink')) {
      rootSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    }
  }
  
  // Get all text and tspan nodes
  const textNodes = doc.getElementsByTagName('text')
  const tspanNodes = doc.getElementsByTagName('tspan')
  
  // Process all text nodes - collect text from node and all its children
  const processTextNode = (node: Element) => {
    // Collect all text content from this node and all its text node descendants
    let fullText = ''
    const collectText = (n: Node) => {
      if (n.nodeType === 3) { // TEXT_NODE
        fullText += n.nodeValue || ''
      }
      // Recursively collect from all children
      if (n.childNodes && n.childNodes.length > 0) {
        for (let i = 0; i < n.childNodes.length; i++) {
          collectText(n.childNodes[i])
        }
      }
    }
    collectText(node)
    
    // Check if this node contains any placeholders (even if split across markup)
    if (fullText.includes('{{')) {
      // Replace placeholders in the text content
      // Note: ICON_URL should be empty in text elements (icons go in image href attributes)
      // Note: BRAND_LOGO is handled separately in DOM phase, skip it here
      let replacedText = fullText
        .replace(/\{\{BRAND_NAME\}\}/g, replacementValues.BRAND_NAME)
        .replace(/\{\{TOTAL_RATINGS\}\}/g, replacementValues.TOTAL_RATINGS)
        .replace(/\{\{NO_RATINGS_TEXT\}\}/g, replacementValues.NO_RATINGS_TEXT)
        .replace(/\{\{SERVER_NAME\}\}/g, replacementValues.SERVER_NAME)
        .replace(/\{\{RATING_DISPLAY\}\}/g, replacementValues.RATING_DISPLAY)
        .replace(/\{\{ICON_URL\}\}/g, '') // Empty in text - icon goes in image href
        // Skip BRAND_LOGO - will be handled in DOM phase
      
      // If text changed, update the node's text content
      if (replacedText !== fullText) {
        // If the text only contained ICON_URL (now empty), remove the entire element
        const originalTextTrimmed = fullText.trim()
        const replacedTextTrimmed = replacedText.trim()
        if (originalTextTrimmed === '{{ICON_URL}}' && replacedTextTrimmed === '') {
          // Remove the entire text element if it only contained ICON_URL
          const parent = node.parentNode
          if (parent) {
            parent.removeChild(node)
            return // Skip further processing since node is removed
          }
        }
        
        // If this is a text element with tspan children, update tspan text nodes instead of replacing structure
        if (node.tagName === 'text') {
          const tspanChildren = node.getElementsByTagName('tspan')
          if (tspanChildren.length > 0) {
            // Collect all text from all tspan children to handle split placeholders
            let combinedText = ''
            for (let i = 0; i < tspanChildren.length; i++) {
              combinedText += (tspanChildren[i] as Element).textContent || ''
            }
            
            // Check if combined text contains any placeholders (handles split placeholders)
            if (combinedText.includes('{{')) {
              // Replace placeholders in combined text
              let combinedReplaced = combinedText
                .replace(/\{\{BRAND_NAME\}\}/g, replacementValues.BRAND_NAME)
                .replace(/\{\{TOTAL_RATINGS\}\}/g, replacementValues.TOTAL_RATINGS)
                .replace(/\{\{NO_RATINGS_TEXT\}\}/g, replacementValues.NO_RATINGS_TEXT)
                .replace(/\{\{SERVER_NAME\}\}/g, replacementValues.SERVER_NAME)
                .replace(/\{\{RATING_DISPLAY\}\}/g, replacementValues.RATING_DISPLAY)
                .replace(/\{\{ICON_URL\}\}/g, '')
              
              // If text changed (placeholder was replaced), update the tspan elements
              if (combinedReplaced !== combinedText) {
                // Use the first tspan's positioning attributes and merge all text into it
                const firstTspan = tspanChildren[0] as Element
                const x = firstTspan.getAttribute('x') || '0'
                const y = firstTspan.getAttribute('y') || '0'
                
                // Clear and update first tspan with replaced text
                while (firstTspan.firstChild) {
                  firstTspan.removeChild(firstTspan.firstChild)
                }
                if (combinedReplaced.trim()) {
                  firstTspan.appendChild(doc.createTextNode(combinedReplaced))
                }
                // Ensure positioning is preserved
                firstTspan.setAttribute('x', x)
                firstTspan.setAttribute('y', y)
                
                // Remove all other tspan elements (they were part of the split placeholder)
                for (let i = tspanChildren.length - 1; i > 0; i--) {
                  const tspan = tspanChildren[i] as Element
                  tspan.parentNode?.removeChild(tspan)
                }
              } else {
                // No placeholders found, process each tspan individually
                for (let i = 0; i < tspanChildren.length; i++) {
                  const tspan = tspanChildren[i] as Element
                  const tspanText = tspan.textContent || ''
                  let tspanReplaced = tspanText
                    .replace(/\{\{BRAND_NAME\}\}/g, replacementValues.BRAND_NAME)
                    .replace(/\{\{TOTAL_RATINGS\}\}/g, replacementValues.TOTAL_RATINGS)
                    .replace(/\{\{NO_RATINGS_TEXT\}\}/g, replacementValues.NO_RATINGS_TEXT)
                    .replace(/\{\{SERVER_NAME\}\}/g, replacementValues.SERVER_NAME)
                    .replace(/\{\{RATING_DISPLAY\}\}/g, replacementValues.RATING_DISPLAY)
                    .replace(/\{\{ICON_URL\}\}/g, '')
                  
                  if (tspanReplaced !== tspanText) {
                    while (tspan.firstChild) {
                      tspan.removeChild(tspan.firstChild)
                    }
                    if (tspanReplaced.trim()) {
                      tspan.appendChild(doc.createTextNode(tspanReplaced))
                    }
                  }
                }
              }
            }
            return // Don't process text element itself if it has tspan children
          }
        }
        
        // Remove all child nodes (text nodes and nested elements)
        while (node.firstChild) {
          node.removeChild(node.firstChild)
        }
        // Only add text node if there's content
        if (replacedText.trim()) {
          node.appendChild(doc.createTextNode(replacedText))
        }
      }
    }
  }
  
  // Process all tspan elements first (they are children of text elements)
  for (let i = 0; i < tspanNodes.length; i++) {
    processTextNode(tspanNodes[i] as Element)
  }
  
  // Then process all text elements (after tspan children have been processed)
  for (let i = 0; i < textNodes.length; i++) {
    processTextNode(textNodes[i] as Element)
  }
  
  // Handle {{BRAND_LOGO}} placeholder - replace text/tspan elements containing it with actual SVG content
  const allTextElements = doc.getElementsByTagName('text')
  const allTspanElements = doc.getElementsByTagName('tspan')
  
  // Process tspan elements first
  for (let i = allTspanElements.length - 1; i >= 0; i--) {
    const tspan = allTspanElements[i] as Element
    const textContent = tspan.textContent || ''
    if (textContent.includes('{{BRAND_LOGO}}')) {
      const parent = tspan.parentNode
      if (parent) {
        // Extract positioning attributes from tspan
        const x = tspan.getAttribute('x') || '0'
        const y = tspan.getAttribute('y') || '0'
        
        // Parse the brand logo SVG content
        const logoParser = new DOMParser()
        const logoDoc = logoParser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${BRAND_LOGO_CONTENT}</svg>`, 'image/svg+xml')
        const logoRoot = logoDoc.documentElement
        
        // Get all child nodes from the logo (defs, rect, text, etc.)
        const logoChildren: Node[] = []
        for (let j = 0; j < logoRoot.childNodes.length; j++) {
          logoChildren.push(logoRoot.childNodes[j].cloneNode(true))
        }
        
        // Create a group element to wrap the logo and preserve positioning
        const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
        const scale = 2.5 // Scale from 32px to 80px (80/32 = 2.5)
        const logoHeight = 80
        group.setAttribute('transform', `translate(${parseFloat(x) + logoHeight/5}, ${parseFloat(y) - logoHeight/1.5}) scale(${scale})`) // Center vertically and scale to 80px
        
        // Add logo children to the group
        logoChildren.forEach(child => {
          group.appendChild(child)
        })
        
        // Replace tspan with positioned group
        // If tspan is the only child of text, replace the text element; otherwise replace just the tspan
        const textParent = parent as Element
        if (textParent.tagName === 'text' && textParent.childNodes.length === 1) {
          // Replace the entire text element
          textParent.parentNode?.insertBefore(group, textParent)
          textParent.parentNode?.removeChild(textParent)
        } else {
          // Replace just the tspan
          parent.insertBefore(group, tspan)
          parent.removeChild(tspan)
        }
      }
    }
  }
  
  // Process text elements (check remaining ones after tspan processing)
  const remainingTextElements = doc.getElementsByTagName('text')
  for (let i = remainingTextElements.length - 1; i >= 0; i--) {
    const textEl = remainingTextElements[i] as Element
    const textContent = textEl.textContent || ''
    if (textContent.includes('{{BRAND_LOGO}}')) {
      const parent = textEl.parentNode
      if (parent) {
        // Extract positioning attributes from text element (check first tspan if exists, or text itself)
        let x = '0'
        let y = '0'
        // Use getElementsByTagName instead of querySelector (not available in @xmldom/xmldom)
        const tspanElements = textEl.getElementsByTagName('tspan')
        const firstTspan = tspanElements.length > 0 ? (tspanElements[0] as Element) : null
        if (firstTspan) {
          x = firstTspan.getAttribute('x') || textEl.getAttribute('x') || '0'
          y = firstTspan.getAttribute('y') || textEl.getAttribute('y') || '0'
        } else {
          x = textEl.getAttribute('x') || '0'
          y = textEl.getAttribute('y') || '0'
        }
        
        // Parse the brand logo SVG content
        const logoParser = new DOMParser()
        const logoDoc = logoParser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${BRAND_LOGO_CONTENT}</svg>`, 'image/svg+xml')
        const logoRoot = logoDoc.documentElement
        
        // Get all child nodes from the logo
        const logoChildren: Node[] = []
        for (let j = 0; j < logoRoot.childNodes.length; j++) {
          logoChildren.push(logoRoot.childNodes[j].cloneNode(true))
        }
        
        // Create a group element to wrap the logo and preserve positioning
        const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
        const scale = 2.5 // Scale from 32px to 80px (80/32 = 2.5)
        const logoHeight = 80
        group.setAttribute('transform', `translate(${parseFloat(x) - logoHeight/5}, ${parseFloat(y) - logoHeight/1.5}) scale(${scale})`) // Center vertically and scale to 80px
        
        // Add logo children to the group
        logoChildren.forEach(child => {
          group.appendChild(child)
        })
        
        // Replace text element with positioned group
        parent.insertBefore(group, textEl)
        parent.removeChild(textEl)
      }
    }
  }
  
  // Handle image elements - replace {{ICON_URL}} placeholder or set href/xlink:href with icon URL or fallback
  const imageElements = doc.getElementsByTagName('image')
  for (let i = 0; i < imageElements.length; i++) {
    const imageElement = imageElements[i] as Element
    // Check for placeholder in xlink:href first
    if (imageElement.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
      const href = imageElement.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''
      if (href.includes('{{ICON_URL}}')) {
        imageElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href.replace(/\{\{ICON_URL\}\}/g, iconUrl))
      } else {
        // No placeholder, but set it anyway to ensure icon is set
        imageElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', iconUrl)
      }
    } else if (imageElement.hasAttribute('href')) {
      const href = imageElement.getAttribute('href') || ''
      if (href.includes('{{ICON_URL}}')) {
        imageElement.setAttribute('href', href.replace(/\{\{ICON_URL\}\}/g, iconUrl))
      } else {
        // No placeholder, but set it anyway to ensure icon is set
        imageElement.setAttribute('href', iconUrl)
      }
    } else {
      // If no href exists, add xlink:href with icon URL
      imageElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', iconUrl)
    }
  }
  
  // Also handle placeholders in other attributes (like href for other elements)
  const allElements = doc.getElementsByTagName('*')
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i] as Element
    // Skip image elements (already handled above)
    if (element.tagName.toLowerCase() === 'image') {
      continue
    }
    // Check href attribute (for other elements)
    if (element.hasAttribute('href')) {
      const href = element.getAttribute('href') || ''
      if (href.includes('{{ICON_URL}}')) {
        element.setAttribute('href', href.replace(/\{\{ICON_URL\}\}/g, iconUrl))
      }
    }
    // Check xlink:href attribute (for other elements)
    if (element.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
      const href = element.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''
      if (href.includes('{{ICON_URL}}')) {
        element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href.replace(/\{\{ICON_URL\}\}/g, iconUrl))
      }
    }
  }
  
  // Serialize back to string
  const serializer = new XMLSerializer()
  result = serializer.serializeToString(doc)
  
  // Remove duplicate xmlns attributes that XMLSerializer might add
  // Use a more robust approach to parse and deduplicate attributes
  result = result.replace(/<svg(\s+[^>]*)?>/i, (match, attributes) => {
    // Handle case where SVG has no attributes
    if (!attributes || !attributes.trim()) {
      return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
    }
    const attrMap = new Map<string, string>()
    const xmlnsSeen = new Set<string>()
    
    // Parse attributes - handle both quoted and unquoted values
    // Match: name="value" or name='value' or name=value
    // Use a more comprehensive regex that handles whitespace better
    const attrRegex = /(\S+?)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    let attrMatch
    let lastIndex = 0
    
    // Reset regex lastIndex to ensure we process all matches
    while ((attrMatch = attrRegex.exec(attributes)) !== null) {
      const name = attrMatch[1].trim()
      const value = (attrMatch[2] || attrMatch[3] || attrMatch[4] || '').trim()
      
      // For xmlns attributes, only keep the first occurrence
      if (name === 'xmlns' || name.startsWith('xmlns:')) {
        if (!xmlnsSeen.has(name)) {
          xmlnsSeen.add(name)
          attrMap.set(name, value)
        }
      } else {
        // For other attributes, keep the last value
        attrMap.set(name, value)
      }
      lastIndex = attrRegex.lastIndex
    }
    
    // Ensure default xmlns is present
    if (!attrMap.has('xmlns')) {
      attrMap.set('xmlns', 'http://www.w3.org/2000/svg')
    }
    
    // Reconstruct the attributes string
    // Put xmlns attributes first, then others
    const xmlnsAttrs: Array<[string, string]> = []
    const otherAttrs: Array<[string, string]> = []
    
    for (const [name, value] of attrMap.entries()) {
      if (name === 'xmlns' || name.startsWith('xmlns:')) {
        xmlnsAttrs.push([name, value])
      } else {
        otherAttrs.push([name, value])
      }
    }
    
    // Sort xmlns attributes: xmlns first, then xmlns:xlink, then others
    xmlnsAttrs.sort((a, b) => {
      if (a[0] === 'xmlns') return -1
      if (b[0] === 'xmlns') return 1
      return a[0].localeCompare(b[0])
    })
    
    const cleanAttrs = [...xmlnsAttrs, ...otherAttrs]
      .map(([name, value]) => {
        // Use double quotes, escape if needed
        const escapedValue = value.replace(/"/g, '&quot;')
        return `${name}="${escapedValue}"`
      })
      .join(' ')
    
    return `<svg ${cleanAttrs}>`
  })
  
  // Final pass: ensure any remaining placeholders are replaced (shouldn't be any, but just in case)
  // Note: ICON_URL in text should be empty, but in attributes it should be the actual URL
  // Note: BRAND_LOGO should already be handled in DOM phase, but replace any remaining as empty
  // At this point, all attribute placeholders should be handled, so only text content remains
  result = result
    .replace(/\{\{BRAND_NAME\}\}/g, replacementValues.BRAND_NAME)
    .replace(/\{\{TOTAL_RATINGS\}\}/g, replacementValues.TOTAL_RATINGS)
    .replace(/\{\{NO_RATINGS_TEXT\}\}/g, replacementValues.NO_RATINGS_TEXT)
    .replace(/\{\{SERVER_NAME\}\}/g, replacementValues.SERVER_NAME)
    .replace(/\{\{RATING_DISPLAY\}\}/g, replacementValues.RATING_DISPLAY)
    // Replace any remaining ICON_URL in text content with empty string
    // (Attributes should already be handled by DOM manipulation above)
    .replace(/\{\{ICON_URL\}\}/g, '')
    // Replace any remaining BRAND_LOGO with empty string (should already be handled in DOM phase)
    .replace(/\{\{BRAND_LOGO\}\}/g, '')
  
  return result
}

export function generateNotFoundBadge(): string {
  const brandName = escapeXml('MCP Review')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" viewBox="0 0 200 20">
    <rect width="200" height="20" fill="#6b7280" rx="3"/>
    <text x="10" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="white" font-weight="600">${brandName}</text>
    <text x="110" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="white">Not Found</text>
  </svg>`
}

export function generateErrorBadge(): string {
  const brandName = escapeXml('MCP Review')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" viewBox="0 0 200 20">
    <rect width="200" height="20" fill="#ef4444" rx="3"/>
    <text x="10" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="white" font-weight="600">${brandName}</text>
    <text x="110" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="white">Error</text>
  </svg>`
}

export interface BadgeData {
  avgRating: number | null
  totalRatings: number
  noRatingsText: string
  serverName: string
  brandName?: string
  iconUrl?: string | null
  showTotals?: boolean
}

export function generateBadge(data: BadgeData): string {
  const hasRatings = data.totalRatings > 0 && data.avgRating !== null && data.avgRating > 0
  const showTotals = data.showTotals ?? true
  const selectedTemplate = selectBadgeTemplate(hasRatings, showTotals)
  
  return replacePlaceholders(selectedTemplate, data)
}
