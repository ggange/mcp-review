"use client"

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ServerGrid } from './server-grid'
import { CategoryFilter } from './category-filter'
import { Pagination } from './pagination'
import { SoonPlaceholder } from '@/components/soon-placeholder'
import type { ServerWithRatings } from '@/types'

interface PaginatedData {
  servers: ServerWithRatings[]
  total: number
  page: number
  totalPages: number
}

interface ServerTabsProps {
  registryData: PaginatedData
  userData: PaginatedData
  registryCounts: Record<string, number>
  userCounts: Record<string, number>
}

export function ServerTabs({ registryData, userData, registryCounts, userCounts }: ServerTabsProps) {
  const [activeTab, setActiveTab] = useState<'registry' | 'community'>('registry')

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'registry' | 'community')} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="registry">
          Registry ({registryCounts.total})
        </TabsTrigger>
        <TabsTrigger value="community">
          Community ({userCounts.total})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="registry" className="mt-0">
        <CategoryFilter 
          categoryCounts={registryCounts} 
          source="registry"
        />
        <div className="mb-4 text-sm text-muted-foreground">
          {registryData.total} {registryData.total === 1 ? 'server' : 'servers'} from the official MCP registry
        </div>
        <ServerGrid 
          servers={registryData.servers}
          pagination={
            <Pagination
              currentPage={registryData.page}
              totalPages={registryData.totalPages}
              total={registryData.total}
            />
          }
        />
      </TabsContent>
      
      <TabsContent value="community" className="mt-0">
        {userData.total === 0 ? (
          <SoonPlaceholder />
        ) : (
          <>
            <CategoryFilter 
              categoryCounts={userCounts} 
              source="user"
            />
            <div className="mb-4 text-sm text-muted-foreground">
              {userData.total} {userData.total === 1 ? 'server' : 'servers'} from the community
            </div>
            <ServerGrid 
              servers={userData.servers}
              pagination={
                <Pagination
                  currentPage={userData.page}
                  totalPages={userData.totalPages}
                  total={userData.total}
                />
              }
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}

