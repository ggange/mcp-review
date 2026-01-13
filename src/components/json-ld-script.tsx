import Script from 'next/script'

interface JsonLdScriptProps {
  data: object
  id?: string
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
