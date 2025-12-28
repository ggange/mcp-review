"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { ServerGrid } from './server-grid'
import { SoonPlaceholder } from './soon-placeholder'
import type { ServerWithRatings } from '@/types'

interface ServerTabsProps {
  registryServers: ServerWithRatings[]
  userServers: ServerWithRatings[]
}

export function ServerTabs({ registryServers, userServers }: ServerTabsProps) {
  return (
    <Tabs defaultValue="registry" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="registry">
          Registry ({registryServers.length})
        </TabsTrigger>
        <TabsTrigger value="community">
          Community ({userServers.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="registry" className="mt-0">
        <div className="mb-4 text-sm text-muted-foreground">
          {registryServers.length} {registryServers.length === 1 ? 'server' : 'servers'} from the official MCP registry
        </div>
        <ServerGrid servers={registryServers} />
      </TabsContent>
      
      <TabsContent value="community" className="mt-0">
        {userServers.length === 0 ? (
          <SoonPlaceholder />
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {userServers.length} {userServers.length === 1 ? 'server' : 'servers'} from the community
            </div>
            <ServerGrid servers={userServers} />
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}

