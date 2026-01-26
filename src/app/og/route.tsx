import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'default'
    const serverId = searchParams.get('serverId')

    // Default OG image
    if (type === 'default' || !serverId) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 200,
                height: 200,
                borderRadius: 48,
                background: 'rgba(255, 255, 255, 0.2)',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                marginBottom: 40,
              }}
            >
              <div
                style={{
                  fontSize: 120,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                M
              </div>
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: 'white',
                marginBottom: 20,
              }}
            >
              MCP Review
            </div>
            <div
              style={{
                fontSize: 28,
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                maxWidth: 900,
              }}
            >
              Discover, Rate, and Review Model Context Protocol Servers
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Server-specific OG image
    if (type === 'server' && serverId) {
      // Fetch server data from internal API to avoid bundling Prisma in Edge runtime
      const decodedId = decodeURIComponent(serverId)
      // Use request URL to determine the base URL for internal API calls
      const requestUrl = new URL(request.url)
      const apiBase = requestUrl.origin
      const apiUrl = `${apiBase}/api/og-server-data?serverId=${encodeURIComponent(decodedId)}`
      
      let server: {
        name: string
        description: string | null
        organization: string | null
        iconUrl: string | null
        avgRating: number | null
        totalRatings: number
        category: string | null
      } | null = null

      try {
        const response = await fetch(apiUrl, {
          // Use cache for better performance, but allow fresh data
          cache: 'no-store', // Always fetch fresh data for OG images
        })
        
        if (response.ok) {
          server = await response.json()
        }
      } catch (error) {
        console.error('Error fetching server data for OG image:', error)
      }

      if (!server) {
        // Fallback to default if server not found
        return new ImageResponse(
          (
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                MCP Review
              </div>
            </div>
          ),
          {
            width: 1200,
            height: 630,
          }
        )
      }

      const avgRating = server.totalRatings > 0 && server.avgRating != null
        ? Number(server.avgRating).toFixed(1)
        : null
      const ratingText = avgRating
        ? `${avgRating}/5 ⭐ (${server.totalRatings} ${server.totalRatings === 1 ? 'review' : 'reviews'})`
        : 'No reviews yet'

      const description = server.description
        ? server.description.length > 120
          ? server.description.slice(0, 120) + '...'
          : server.description
        : `MCP server by ${server.organization || 'Unknown'}`

      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              padding: 60,
            }}
          >
            {/* Left side - Server info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'center',
                paddingRight: 40,
              }}
            >
              {/* Server icon placeholder or name initial */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  marginBottom: 30,
                }}
              >
                <div
                  style={{
                    fontSize: 60,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {server.name.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Server name */}
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: 'white',
                  marginBottom: 16,
                  lineHeight: 1.2,
                }}
              >
                {server.name}
              </div>

              {/* Organization */}
              {server.organization && (
                <div
                  style={{
                    fontSize: 24,
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: 20,
                  }}
                >
                  by {server.organization}
                </div>
              )}

              {/* Rating */}
              <div
                style={{
                  fontSize: 28,
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontWeight: 600,
                  marginBottom: 20,
                }}
              >
                {ratingText}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: 20,
                  color: 'rgba(255, 255, 255, 0.85)',
                  lineHeight: 1.4,
                  maxWidth: 600,
                }}
              >
                {description}
              </div>
            </div>

            {/* Right side - Branding */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                width: 300,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 100,
                  height: 100,
                  borderRadius: 24,
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  M
                </div>
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'right',
                }}
              >
                MCP Review
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Fallback
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
            }}
          >
            MCP Review
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG image generation error:', error)
    // Return a simple error image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
            }}
          >
            MCP Review
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
