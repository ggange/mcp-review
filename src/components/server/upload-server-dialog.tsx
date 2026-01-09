'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ServerUploadForm } from './server-upload-form'

interface UploadServerDialogProps {
  initialOpen?: boolean
}

export function UploadServerDialog({ initialOpen = false }: UploadServerDialogProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Initialize state based on URL param or prop
  const [open, setOpen] = useState(() => {
    if (initialOpen) return true
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('upload') === 'true'
    }
    return false
  })

  // Clean up URL param after opening dialog
  useEffect(() => {
    if (open && searchParams.get('upload') === 'true') {
      // Remove the query param from URL without triggering a navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('upload')
      router.replace(url.pathname, { scroll: false })
    }
  }, [open, searchParams, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600">
          Upload a server
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload New Server</DialogTitle>
        </DialogHeader>
        <ServerUploadForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
