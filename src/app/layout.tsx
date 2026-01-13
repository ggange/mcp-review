import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Montserrat, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/navbar'
import { NavbarSkeleton } from '@/components/navbar-skeleton'
import { Footer } from '@/components/footer'

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  // Optimize font loading for FCP
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Monospace font is less critical, don't preload
  fallback: ['monospace'],
  adjustFontFallback: false,
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'MCP Review - Open Source MCP Server Directory & Community Reviews',
    template: '%s | MCP Review',
  },
  description: 'The #1 open-source directory for Model Context Protocol (MCP) servers. Community-driven ratings, reviews, and discovery platform for AI developers. Find trusted MCP servers for Claude, Cursor, and other AI tools. Free, transparent, MIT licensed.',
  keywords: [
    'MCP',
    'Model Context Protocol',
    'MCP servers',
    'MCP directory',
    'MCP registry',
    'open source',
    'open-source',
    'OSS',
    'community-driven',
    'community reviews',
    'AI tools',
    'AI agents',
    'AI workflows',
    'server reviews',
    'server ratings',
    'Claude MCP',
    'Cursor MCP',
    'LLM tools',
    'developer tools',
    'free software',
    'MIT license',
    'GitHub',
    'Anthropic',
    'AI integrations',
    'MCP ecosystem',
  ],
  authors: [{ name: 'MCP Review Community' }, { name: 'ggange', url: 'https://github.com/ggange' }],
  creator: 'ggange',
  publisher: 'MCP Review Community',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'MCP Review',
    title: 'MCP Review - Open Source MCP Server Directory & Community Reviews',
    description: 'The #1 open-source directory for Model Context Protocol servers. Community-driven ratings and reviews for AI developers. Free, transparent, and MIT licensed.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MCP Review - Open Source MCP Server Directory for AI Developers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP Review - Open Source MCP Server Directory',
    description: 'The #1 open-source directory for MCP servers. Community-driven ratings & reviews for AI developers. Free & MIT licensed. ⭐ Star us on GitHub!',
    creator: '@ggange',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  alternates: {
    canonical: baseUrl,
  },
  category: 'technology',
  other: {
    'theme-color': '#7c3aed', // violet-600
    'github:repo': 'https://github.com/ggange/mcp-review',
    'fediverse:creator': '@ggange',
  },
  applicationName: 'MCP Review',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical external domains for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://api.github.com" />
        {/* Preload critical resources */}
        <link rel="preload" href="/icon.svg" as="image" type="image/svg+xml" />
      </head>
      <body
        className={`${montserrat.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>
          <Suspense fallback={<NavbarSkeleton />}>
            <Navbar />
          </Suspense>
          <main>{children}</main>
          <Footer />
        </Providers>
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
        <SpeedInsights />
      </body>
    </html>
  )
}
