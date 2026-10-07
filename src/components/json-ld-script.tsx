import Script from 'next/script'

interface JsonLdScriptProps {
  data: object
  id?: string
}

/**
 * Serialize JSON-LD for embedding in a <script> tag. Escaping "<" keeps
 * user-provided text (server descriptions, reviews) from closing the tag.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * JSON-LD script component that defers loading to avoid blocking FCP
 * Uses next/script with afterInteractive strategy for better performance
 */
export function JsonLdScript({ data, id }: JsonLdScriptProps) {
  return (
    <Script
      id={id || 'json-ld'}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
