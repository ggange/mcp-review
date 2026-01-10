import type { Metadata } from 'next'
import { Montserrat, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'MCP Review - Open Source MCP Server Directory',
    template: '%s | MCP Review',
  },
  description: 'Open-source platform to discover, rate, and review Model Context Protocol servers. Community-driven ratings and reviews for MCP servers. Free, transparent, and built by developers for developers.',
  keywords: [
    'MCP',
    'Model Context Protocol',
    'MCP servers',
    'open source',
    'open-source',
    'community-driven',
    'AI tools',
    'server reviews',
    'MCP registry',
    'AI workflows',
    'developer tools',
    'free software',
    'MIT license',
    'GitHub',
  ],
  authors: [{ name: 'MCP Review Community' }, { name: 'ggange', url: 'https://github.com/ggange' }],
  creator: 'ggange',
  publisher: 'MCP Review',
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
    title: 'MCP Review - Open Source MCP Server Directory',
    description: 'Open-source platform to discover, rate, and review Model Context Protocol servers. Community-driven, free, and transparent. Built by developers for developers.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MCP Review - Open Source MCP Server Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP Review - Open Source MCP Server Directory',
    description: 'Open-source platform to discover, rate, and review MCP servers. Community-driven, free, and transparent. ⭐ Star us on GitHub!',
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
      <body
        className={`${montserrat.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>
          <Navbar />
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
      </body>
    </html>
  )
}
