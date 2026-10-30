import { prisma } from './db'
import type { MCPRegistryResponse, MCPRegistryServer } from '@/types'
import { categorizeServer } from './server-categories'
import { Prisma } from '@prisma/client'
import { invalidateServerListCache } from './cache'

const REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers'

/**
 * Parse server name from registry format (e.g., "ai.exa/exa" -> { organization: "ai.exa", name: "exa" })
 */
export function parseServerName(fullName: string): { organization: string; name: string } {
  const parts = fullName.split('/')
  if (parts.length >= 2) {
    return {
      organization: parts[0],
      name: parts.slice(1).join('/'),
    }
  }
  return {
    organization: 'unknown',
    name: fullName,
  }
}

/**
 * Fetch servers from the MCP registry with pagination
 */
async function fetchRegistryPage(cursor?: string): Promise<MCPRegistryResponse> {
  const url = cursor ? `${REGISTRY_URL}?cursor=${cursor}` : REGISTRY_URL
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache registry responses for 1 hour at the edge
  })

  if (!response.ok) {
    throw new Error(`Registry API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Transform registry server to our database format
 */
function transformServer(registryServer: MCPRegistryServer): {
  id: string
  name: string
  organization: string
  description: string | null
  version: string | null
  repositoryUrl: string | null
  packages: Prisma.InputJsonValue | typeof Prisma.JsonNull
  remotes: Prisma.InputJsonValue | typeof Prisma.JsonNull
  category: string
  source: string
} {
  const { server } = registryServer
  const { organization, name } = parseServerName(server.name)
  
  // Use the full name as ID to ensure uniqueness
  const id = server.name

  // Categorize server based on description
  const category = categorizeServer(server.description || null)

  return {
    id,
    name,
    organization,
    description: server.description || null,
    version: server.version || null,
    repositoryUrl: server.repository?.url || null,
    packages: server.packages ? (server.packages as Prisma.InputJsonValue) : Prisma.JsonNull,
    remotes: server.remotes ? (server.remotes as Prisma.InputJsonValue) : Prisma.JsonNull,
    category,
    source: 'registry',
  }
}

type TransformedServer = ReturnType<typeof transformServer>

/**
 * Compare a stored server with freshly transformed registry data
 */
export function hasServerChanged(
  current: Record<keyof Omit<TransformedServer, 'id'>, unknown>,
  next: TransformedServer
): boolean {
  // jsonb does not preserve key order, so compare with keys sorted
  const stableStringify = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
    if (value && typeof value === 'object') {
      const entries = Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      return `{${entries.join(',')}}`
    }
    return JSON.stringify(value)
  }
  const normalizeJson = (value: unknown) =>
    value === Prisma.JsonNull || value === null || value === undefined ? null : stableStringify(value)

  return (
    current.name !== next.name ||
    current.organization !== next.organization ||
    current.description !== next.description ||
    current.version !== next.version ||
    current.repositoryUrl !== next.repositoryUrl ||
    current.category !== next.category ||
    current.source !== next.source ||
    normalizeJson(current.packages) !== normalizeJson(next.packages) ||
    normalizeJson(current.remotes) !== normalizeJson(next.remotes)
  )
}

/**
 * Sync all servers from the MCP registry
 */
export async function syncRegistry(): Promise<{ 
  synced: number
  errors: string[]
}> {
  const errors: string[] = []
  let synced = 0
  let written = 0
  let cursor: string | undefined

  try {
    // Fetch all pages from the registry
    const allServers: MCPRegistryServer[] = []
    
    do {
      const response = await fetchRegistryPage(cursor)
      allServers.push(...response.servers)
      cursor = response.metadata?.nextCursor
    } while (cursor)

    // Group servers by ID and keep only the latest version
    const latestServers = new Map<string, MCPRegistryServer>()
    for (const server of allServers) {
      const meta = server._meta?.['io.modelcontextprotocol.registry/official']
      if (meta?.isLatest) {
        latestServers.set(server.server.name, server)
      }
    }

    // If no latest versions found, use all servers (deduplicated by name)
    if (latestServers.size === 0) {
      for (const server of allServers) {
        if (!latestServers.has(server.server.name)) {
          latestServers.set(server.server.name, server)
        }
      }
    }

    // Only write servers that are new or whose registry data changed.
    // Upserting every server on each run rewrote thousands of unchanged rows,
    // which kept the database busy for the whole sync.
    const transformed = [...latestServers.values()].map(transformServer)
    const existing = await prisma.server.findMany({
      where: { id: { in: transformed.map((s) => s.id) } },
      select: {
        id: true,
        name: true,
        organization: true,
        description: true,
        version: true,
        repositoryUrl: true,
        packages: true,
        remotes: true,
        category: true,
        source: true,
      },
    })
    const existingById = new Map(existing.map((s) => [s.id, s]))

    for (const serverData of transformed) {
      const current = existingById.get(serverData.id)
      if (current && !hasServerChanged(current, serverData)) {
        synced++
        continue
      }

      try {
        await prisma.server.upsert({
          where: { id: serverData.id },
          create: {
            ...serverData,
            syncedAt: new Date(),
          },
          update: {
            ...serverData,
            syncedAt: new Date(),
          },
        })
        
        synced++
        written++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to sync ${serverData.id}: ${errorMessage}`)
        if (process.env.NODE_ENV !== 'production') {
          console.error(`Failed to sync ${serverData.id}:`, errorMessage)
        }
      }
    }

    if (written > 0) {
      await invalidateServerListCache()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Registry sync failed: ${errorMessage}`)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Registry sync failed:', errorMessage)
    }
  }

  return { synced, errors }
}

