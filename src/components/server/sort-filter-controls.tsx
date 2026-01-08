'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AdvancedFilters } from './advanced-filters'

type SortOption = 'most-reviewed' | 'top-rated' | 'newest' | 'trending'
type MinRatingOption = '0' | '3' | '4' | '4.5'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'most-reviewed', label: 'Most Reviewed' },
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'trending', label: 'Trending' },
]

const RATING_OPTIONS: { value: MinRatingOption; label: string }[] = [
  { value: '0', label: 'Any Rating' },
  { value: '3', label: '3+ Stars' },
  { value: '4', label: '4+ Stars' },
  { value: '4.5', label: '4.5+ Stars' },
]

export function SortFilterControls() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentSort = (searchParams.get('sort') || 'most-reviewed') as SortOption
  const currentMinRating = (searchParams.get('minRating') || '0') as MinRatingOption
  const currentHasGithub = searchParams.get('hasGithub') === 'true'
  const currentSearch = searchParams.get('q') || ''
  const currentCategory = searchParams.get('category') || 'all'
  
  // Check if advanced filters are active to determine default open state
  const currentDateFrom = searchParams.get('dateFrom')
  const currentDateTo = searchParams.get('dateTo')
  const currentMaxRating = searchParams.get('maxRating')
  const hasActiveFilters = !!(currentDateFrom || currentDateTo || currentMaxRating || 
    (currentMinRating && !['0', '3', '4', '4.5'].includes(currentMinRating)))
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(hasActiveFilters)

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams()
    
    // Preserve existing params
    if (currentSearch) params.set('q', currentSearch)
    if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory)
    
    // Preserve advanced filter params
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const maxRating = searchParams.get('maxRating')
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (maxRating) params.set('maxRating', maxRating)
    
    // Preserve hasGithub if not being updated
    if (!('hasGithub' in updates)) {
      const hasGithub = searchParams.get('hasGithub')
      if (hasGithub) params.set('hasGithub', hasGithub)
    }
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '0' && value !== 'most-reviewed') {
        params.set(key, value)
      } else if (value === null || value === '0' || value === 'most-reviewed') {
        params.delete(key)
      }
    })
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    router.push(`?${params.toString()}`)
  }

  const handleSortChange = (value: SortOption) => {
    updateParams({ sort: value })
  }

  const handleMinRatingChange = (value: MinRatingOption) => {
    updateParams({ minRating: value })
  }

  const handleHasGithubChange = (checked: boolean) => {
    updateParams({ hasGithub: checked ? 'true' : null })
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Sort:
          </label>
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger id="sort-select" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="rating-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Min Rating:
          </label>
          <Select value={currentMinRating} onValueChange={handleMinRatingChange}>
            <SelectTrigger id="rating-select" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATING_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="has-github-checkbox" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
            GitHub Repository
          </label>
          <input
            type="checkbox"
            id="has-github-checkbox"
            checked={currentHasGithub}
            onChange={(e) => handleHasGithubChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
          className="h-8 gap-1.5"
        >
          Advanced Filters
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isAdvancedFiltersOpen && "rotate-180"
            )}
          />
        </Button>
      </div>
      
      <AdvancedFilters open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen} />
    </div>
  )
}

