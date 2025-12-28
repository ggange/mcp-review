import { prisma } from './db'
import type { MCPRegistryResponse, MCPRegistryServer } from '@/types'

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
    next: { revalidate: 0 }, // Don't cache during sync
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
  packages: unknown
  remotes: unknown
  isOfficial: boolean
} {
  const { server, _meta } = registryServer
  const { organization, name } = parseServerName(server.name)
  
  // Use the full name as ID to ensure uniqueness
  const id = server.name

  return {
    id,
    name,
    organization,
    description: server.description || null,
    version: server.version || null,
    repositoryUrl: server.repository?.url || null,
    packages: server.packages || null,
    remotes: server.remotes || null,
    isOfficial: _meta?.['io.modelcontextprotocol.registry/official']?.status === 'active',
  }
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
  let cursor: string | undefined

  try {
    // Fetch all pages from the registry
    const allServers: MCPRegistryServer[] = []
    
    do {
      const response = await fetchRegistryPage(cursor)
      allServers.push(...response.servers)
      cursor = response.metadata?.nextCursor
    } while (cursor)

    console.log(`Fetched ${allServers.length} servers from registry`)

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

    console.log(`Processing ${latestServers.size} unique servers`)

    // Upsert each server
    for (const registryServer of latestServers.values()) {
      try {
        const serverData = transformServer(registryServer)
        
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to sync ${registryServer.server.name}: ${errorMessage}`)
        console.error(`Failed to sync ${registryServer.server.name}:`, error)
      }
    }

    // Mark servers not in the registry as unofficial
    const syncedIds = Array.from(latestServers.keys())
    if (syncedIds.length > 0) {
      await prisma.server.updateMany({
        where: {
          id: { notIn: syncedIds },
          isOfficial: true,
        },
        data: {
          isOfficial: false,
        },
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Registry sync failed: ${errorMessage}`)
    console.error('Registry sync failed:', error)
  }

  return { synced, errors }
}

