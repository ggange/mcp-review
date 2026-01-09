'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible } from '@/components/ui/collapsible'
import { useCallback, useState, useTransition } from 'react'

// Helper to get search param value
function getSearchParam(params: URLSearchParams, key: string): string {
  return params.get(key) || ''
}

interface AdvancedFiltersProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AdvancedFilters({ open, onOpenChange }: AdvancedFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  // Get current values from URL params - these are the source of truth
  const currentDateFrom = getSearchParam(searchParams, 'dateFrom')
  const currentDateTo = getSearchParam(searchParams, 'dateTo')
  const currentMinRating = getSearchParam(searchParams, 'minRating')
  const currentMaxRating = getSearchParam(searchParams, 'maxRating')
  
  // Local state for inputs - initialized from URL params
  const [dateFrom, setDateFrom] = useState(currentDateFrom)
  const [dateTo, setDateTo] = useState(currentDateTo)
  const [minRating, setMinRating] = useState(currentMinRating)
  const [maxRating, setMaxRating] = useState(currentMaxRating)

  // Sync local state when URL params change (using key to detect changes)
  const paramsKey = `${currentDateFrom}|${currentDateTo}|${currentMinRating}|${currentMaxRating}`
  const [lastParamsKey, setLastParamsKey] = useState(paramsKey)
  
  if (paramsKey !== lastParamsKey) {
    setLastParamsKey(paramsKey)
    setDateFrom(currentDateFrom)
    setDateTo(currentDateTo)
    setMinRating(currentMinRating)
    setMaxRating(currentMaxRating)
  }

  const currentSearch = searchParams.get('q') || ''
  const currentCategory = searchParams.get('category') || 'all'
  const currentSort = searchParams.get('sort') || 'most-reviewed'

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams()
      
      // Preserve existing params
      if (currentSearch) params.set('q', currentSearch)
      if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory)
      if (currentSort && currentSort !== 'most-reviewed') params.set('sort', currentSort)
      
      // Preserve source if not being updated
      const source = searchParams.get('source')
      if (!('source' in updates) && source && source !== 'all') {
        params.set('source', source)
      }
      
      // Preserve minRating if not being updated (from simple filter dropdown)
      if (!('minRating' in updates) && currentMinRating) {
        params.set('minRating', currentMinRating)
      }
      
      // Preserve hasGithub if not being updated
      const hasGithub = searchParams.get('hasGithub')
      if (!('hasGithub' in updates) && hasGithub) {
        params.set('hasGithub', hasGithub)
      }
      
      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      
      // Reset to page 1 when filters change
      params.set('page', '1')
      
      router.replace(`?${params.toString()}`, { scroll: false })
    })
  }, [router, currentSearch, currentCategory, currentSort, currentMinRating, searchParams])

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    updateParams({ dateFrom: value || null })
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    updateParams({ dateTo: value || null })
  }

  const handleMinRatingChange = (value: string) => {
    setMinRating(value)
    const numValue = parseFloat(value)
    if (value === '' || isNaN(numValue) || numValue <= 0) {
      updateParams({ minRating: null })
    } else {
      updateParams({ minRating: value })
    }
  }

  const handleMaxRatingChange = (value: string) => {
    setMaxRating(value)
    const numValue = parseFloat(value)
    if (value === '' || isNaN(numValue) || numValue <= 0) {
      updateParams({ maxRating: null })
    } else {
      updateParams({ maxRating: value })
    }
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setMinRating('')
    setMaxRating('')
    updateParams({
      dateFrom: null,
      dateTo: null,
      minRating: null,
      maxRating: null,
    })
  }

  // Only consider advanced filters as active (not the simple minRating dropdown)
  const hasActiveFilters = !!(currentDateFrom || currentDateTo || currentMaxRating || 
    (currentMinRating && !['0', '3', '4', '4.5'].includes(currentMinRating)))

  return (
    <Collapsible 
      open={open} 
      onOpenChange={onOpenChange} 
      defaultOpen={open === undefined ? hasActiveFilters : undefined}
    >
      <div className="space-y-6 py-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Date Range</Label>
          <p className="text-sm text-muted-foreground">
            Filter servers by creation date
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-full"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="w-full"
                disabled={isPending}
                min={dateFrom || undefined}
              />
            </div>
          </div>
        </div>

        {/* Rating Range Filter */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Rating Range</Label>
          <p className="text-sm text-muted-foreground">
            Filter servers by average rating (1-5 scale)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-rating">Min Rating</Label>
              <Input
                id="min-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="0"
                value={minRating}
                onChange={(e) => handleMinRatingChange(e.target.value)}
                className="w-full"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-rating">Max Rating</Label>
              <Input
                id="max-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="5"
                value={maxRating}
                onChange={(e) => handleMaxRatingChange(e.target.value)}
                className="w-full"
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground underline"
              disabled={isPending}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </Collapsible>
  )
}

