import type { NextConfig } from "next";

// Build remote patterns array
const remotePatterns: Array<{
  protocol: 'http' | 'https'
  hostname: string
  port?: string
  pathname: string
}> = [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '3000',
    pathname: '/api/icons/**',
  },
  {
    protocol: 'https',
    hostname: 'localhost',
    port: '3000',
    pathname: '/api/icons/**',
  },
]

// Add production domain if set
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL)
    remotePatterns.push({
      protocol: 'https',
      hostname: url.hostname,
      pathname: '/api/icons/**',
    })
  } catch {
    // Invalid URL, skip
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    // Optimize images for better FCP
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Enable compression for better performance
  compress: true,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cloud.umami.is",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.github.com https://registry.modelcontextprotocol.io https://cloud.umami.is https://api-gateway.umami.dev",
              "frame-ancestors 'none'",
              // Additional security directives
              "object-src 'none'", // Prevent plugins (Flash, Java, etc.)
              "base-uri 'self'", // Prevent base tag injection attacks
              "form-action 'self'", // Restrict form submissions to same origin
              "upgrade-insecure-requests", // Auto-upgrade HTTP to HTTPS
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
