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

export const metadata: Metadata = {
  title: 'MCP Review',
  description: 'Discover, rate, and review Model Context Protocol servers',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'MCP Review',
    description: 'Discover, rate, and review Model Context Protocol servers',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
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
