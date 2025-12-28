'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCategoryDisplayName, getCategories, type ServerCategory } from '@/lib/server-categories'

interface CategoryFilterProps {
  categoryCounts?: Record<string, number>
  source: 'registry' | 'user'
}

export function CategoryFilter({ categoryCounts, source }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'
  const currentSearch = searchParams.get('q') || ''
  const currentPage = searchParams.get('page') || '1'

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams()
    
    // Preserve search query
    if (currentSearch) {
      params.set('q', currentSearch)
    }
    
    // Set category (or remove if 'all')
    if (category !== 'all') {
      params.set('category', category)
    }
    
    // Reset to page 1 when category changes
    if (category !== currentCategory) {
      params.set('page', '1')
    } else if (currentPage !== '1') {
      params.set('page', currentPage)
    }

    router.push(`?${params.toString()}`)
  }

  const categories = getCategories()

  return (
    <Tabs value={currentCategory} onValueChange={handleCategoryChange} className="w-full mb-6">
      <TabsList className="flex-wrap h-auto p-1">
        <TabsTrigger value="all" className="data-[state=active]:bg-background">
          All {categoryCounts && categoryCounts.total !== undefined && `(${categoryCounts.total})`}
        </TabsTrigger>
        {categories.map((category) => {
          const count = categoryCounts?.[category]
          return (
            <TabsTrigger
              key={category}
              value={category}
              className="data-[state=active]:bg-background"
            >
              {getCategoryDisplayName(category)}
              {count !== undefined && ` (${count})`}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

