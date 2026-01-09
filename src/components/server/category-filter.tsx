'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCategoryDisplayName, getCategories} from '@/lib/server-categories'

interface CategoryFilterProps {
  categoryCounts?: Record<string, number>
}

export function CategoryFilter({ categoryCounts }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const currentCategory = searchParams.get('category') || 'all'
  const currentSearch = searchParams.get('q') || ''
  const currentPage = searchParams.get('page') || '1'

  const handleCategoryChange = (category: string) => {
    startTransition(() => {
    const params = new URLSearchParams()
    
    // Preserve search query
    if (currentSearch) {
      params.set('q', currentSearch)
    }
    
    // Preserve source filter
    const currentSource = searchParams.get('source')
    if (currentSource && currentSource !== 'all') {
      params.set('source', currentSource)
    }
    
    // Preserve other filters
    const sort = searchParams.get('sort')
    if (sort && sort !== 'most-reviewed') {
      params.set('sort', sort)
    }
    const minRating = searchParams.get('minRating')
    if (minRating && minRating !== '0') {
      params.set('minRating', minRating)
    }
    const maxRating = searchParams.get('maxRating')
    if (maxRating) {
      params.set('maxRating', maxRating)
    }
    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) {
      params.set('dateFrom', dateFrom)
    }
    const dateTo = searchParams.get('dateTo')
    if (dateTo) {
      params.set('dateTo', dateTo)
    }
    const hasGithub = searchParams.get('hasGithub')
    if (hasGithub) {
      params.set('hasGithub', hasGithub)
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

    router.replace(`?${params.toString()}`, { scroll: false })
    })
  }

  const categories = getCategories()

  return (
    <Tabs value={currentCategory} onValueChange={handleCategoryChange} className="w-full mb-6">
      <div className="flex justify-center">
        <TabsList className="flex-wrap h-auto p-1 justify-center">
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
      </div>
    </Tabs>
  )
}


