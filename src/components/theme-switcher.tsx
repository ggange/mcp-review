'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Track mount state outside React to avoid hydration mismatch
const mountStore = {
  mounted: false,
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  },
  getSnapshot() {
    return this.mounted
  },
  getServerSnapshot() {
    return false
  },
  setMounted() {
    this.mounted = true
    this.listeners.forEach(l => l())
  }
}

// Initialize on client side
if (typeof window !== 'undefined') {
  mountStore.setMounted()
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    mountStore.subscribe.bind(mountStore),
    mountStore.getSnapshot.bind(mountStore),
    mountStore.getServerSnapshot.bind(mountStore)
  )

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <div className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}


