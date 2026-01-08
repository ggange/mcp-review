"use client"

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ServerGrid } from './server-grid'
import { CategoryFilter } from './category-filter'
import { SortFilterControls } from './sort-filter-controls'
import { Pagination } from './pagination'
import { SoonPlaceholder } from '@/components/soon-placeholder'
import type { ServerWithRatings } from '@/types'
import Link from 'next/link'

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
          <div className="mb-4 rounded-md bg-violet-100 dark:bg-violet-900/50 px-4 py-2 text-sm font-medium text-violet-900 dark:text-violet-200 border border-violet-200 dark:border-violet-700 shadow-sm flex items-center gap-2">
            <svg className="h-4 w-4 text-violet-600 dark:text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" /></svg>
            Registry servers from the <Link href="https://registry.modelcontextprotocol.io" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">official MCP registry</Link>
          </div>
        <CategoryFilter 
          categoryCounts={registryCounts} 
          source="registry"
        />
        <SortFilterControls />
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
            <SortFilterControls />
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

