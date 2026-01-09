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
    default: 'MCP Review',
    template: '%s | MCP Review',
  },
  description: 'Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows with community-driven ratings and reviews.',
  keywords: [
    'MCP',
    'Model Context Protocol',
    'MCP servers',
    'AI tools',
    'server reviews',
    'MCP registry',
    'AI workflows',
    'developer tools',
  ],
  authors: [{ name: 'MCP Review Team' }],
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
    title: 'MCP Review - Discover, Rate, and Review Model Context Protocol Servers',
    description: 'Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows with community-driven ratings and reviews.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MCP Review - Discover, Rate, and Review Model Context Protocol Servers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP Review - Discover, Rate, and Review Model Context Protocol Servers',
    description: 'Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows.',
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
  },
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
