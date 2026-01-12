'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { OfficialServerUploadForm } from './official-server-upload-form'

interface UploadOfficialServerDialogProps {
  initialOpen?: boolean
}

export function UploadOfficialServerDialog({ initialOpen = false }: UploadOfficialServerDialogProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Initialize state based on URL param or prop
  const [open, setOpen] = useState(() => {
    if (initialOpen) return true
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('upload-official') === 'true'
    }
    return false
  })

  // Clean up URL param after opening dialog
  useEffect(() => {
    if (open && searchParams.get('upload-official') === 'true') {
      // Remove the query param from URL without triggering a navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('upload-official')
      router.replace(url.pathname, { scroll: false })
    }
  }, [open, searchParams, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600">
          Upload Official Server
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Official Server</DialogTitle>
        </DialogHeader>
        <OfficialServerUploadForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
