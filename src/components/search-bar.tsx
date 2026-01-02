'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get('q') || '')
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSearch = useCallback(
    (term: string) => {
      setValue(term)
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Debounce the actual search
      timeoutRef.current = setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString())
          if (term) {
            params.set('q', term)
          } else {
            params.delete('q')
          }
          // Reset to page 1 when search changes
          params.set('page', '1')
          router.push(`/?${params.toString()}`)
        })
      }, 300)
    },
    [router, searchParams]
  )

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <Input
        type="search"
        placeholder="Search MCP servers..."
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-12 w-full bg-background pl-10 text-foreground placeholder:text-muted-foreground border-border focus:border-violet-500 focus:ring-violet-500"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-violet-500" />
        </div>
      )}
    </div>
  )
}

