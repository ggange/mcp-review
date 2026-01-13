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
  organization: string | null
  description: string | null
  version: string | null
  repositoryUrl: string | null
  packages: unknown
  remotes: unknown
  avgTrustworthiness: number
  avgUsefulness: number
  totalRatings: number
  category: string | null
  createdAt: Date
  syncedAt: Date
  source: 'registry' | 'user' | 'official'
  iconUrl: string | null
  tools: Array<{ name: string; description: string }> | null
  usageTips: string | null
  userId: string | null
  authorUsername: string | null
  hasManyTools: boolean
  completeToolsUrl: string | null
}

export interface RatingInput {
  serverId: string
  trustworthiness: number
  usefulness: number
  text?: string
}

export interface ReviewVoteInput {
  helpful: boolean
}

export interface ReviewWithVotes {
  id: string
  trustworthiness: number
  usefulness: number
  text: string | null
  status: string
  helpfulCount: number
  notHelpfulCount: number
  createdAt: Date
  updatedAt: Date
  userId: string
  user: {
    name: string | null
    image: string | null
  }
  userVote?: {
    helpful: boolean
  } | null
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

// GitHub repository parsing
export interface GitHubRepoParseResult {
  name: string
  organization: string | null
  description: string
  tools: Array<{ name: string; description: string }>
  usageTips: string | null
  version: string | null
  repositoryUrl: string
  category: string
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

