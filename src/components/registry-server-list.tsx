import { ServerGrid } from './server-grid'
import type { ServerWithRatings } from '@/types'

interface RegistryServerListProps {
  servers: ServerWithRatings[]
}

export function RegistryServerList({ servers }: RegistryServerListProps) {
  return (
    <div>
      <div className="mb-4 text-sm text-slate-400">
        {servers.length} {servers.length === 1 ? 'server' : 'servers'} from the official MCP registry
      </div>
      <ServerGrid servers={servers} />
    </div>
  )
}

