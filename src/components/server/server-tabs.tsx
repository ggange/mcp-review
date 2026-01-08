import { ServerGrid } from './server-grid'
import { CategoryFilter } from './category-filter'
import { SortFilterControls } from './sort-filter-controls'
import { Pagination } from './pagination'
import type { ServerWithRatings } from '@/types'

interface PaginatedData {
  servers: ServerWithRatings[]
  total: number
  page: number
  totalPages: number
}

interface ServerListProps {
  data: PaginatedData
  categoryCounts: Record<string, number>
}

export function ServerList({ data, categoryCounts }: ServerListProps) {
  return (
    <div className="w-full">
      <CategoryFilter categoryCounts={categoryCounts} />
      <SortFilterControls />
      <div className="mb-4 text-sm text-muted-foreground">
        {data.total} {data.total === 1 ? 'server' : 'servers'} found
      </div>
      <ServerGrid 
        servers={data.servers}
        pagination={
          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            total={data.total}
          />
        }
      />
    </div>
  )
}

