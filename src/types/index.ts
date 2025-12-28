// MCP Registry API types
export interface MCPRegistryServer {
  server: {
    $schema?: string
    name: string
    description?: string
    repository?: {
      url?: string
      source?: string
    }
    version?: string
    packages?: Array<{
      registryType?: string
      identifier?: string
      transport?: { type: string }
    }>
    remotes?: Array<{
      type: string
      url: string
    }>
    icons?: Array<{
      src: string
    }>
  }
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      status: string
      publishedAt: string
      updatedAt: string
      isLatest: boolean
    }
  }
}

export interface MCPRegistryResponse {
  servers: MCPRegistryServer[]
  metadata?: {
    nextCursor?: string
    count?: number
  }
}

// Application types
export interface ServerWithRatings {
  id: string
  name: string
  organization: string
  description: string | null
  version: string | null
  repositoryUrl: string | null
  packages: unknown
  remotes: unknown
  avgTrustworthiness: number
  avgUsefulness: number
  totalRatings: number
  isOfficial: boolean
  syncedAt: Date
  source: 'registry' | 'user'
}

export interface RatingInput {
  serverId: string
  trustworthiness: number
  usefulness: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  total?: number
}

// NextAuth type extensions
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

