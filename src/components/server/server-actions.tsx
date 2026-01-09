'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ServerUploadForm } from './server-upload-form'

interface ServerActionsProps {
  serverId: string
}

export function ServerActions({ serverId }: ServerActionsProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
      return
    }

    setDeleteError(null)
    startDeleteTransition(async () => {
      try {
        const response = await fetch(`/api/servers/${encodeURIComponent(serverId)}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to delete server')
        }

        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete server')
      }
    })
  }

  return (
    <div className="flex gap-2">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Server</DialogTitle>
          </DialogHeader>
          <ServerEditForm 
            serverId={serverId} 
            onSuccess={() => {
              setIsEditDialogOpen(false)
              router.refresh()
            }} 
          />
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-destructive hover:text-destructive"
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>

      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}
    </div>
  )
}

interface ServerEditFormProps {
  serverId: string
  onSuccess?: () => void
}

interface ServerFormData {
  name: string
  organization: string
  description: string
  tools: Array<{ name: string; description: string }>
  usageTips: string
  version: string
  repositoryUrl: string
  iconUrl: string
  category: string
}

function ServerEditForm({ serverId, onSuccess }: ServerEditFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [serverData, setServerData] = useState<ServerFormData | null>(null)
  const [loading, setLoading] = useState(true)

  // Load server data
  useEffect(() => {
    fetch(`/api/servers/${encodeURIComponent(serverId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const server = data.data
          setServerData({
            name: server.name,
            organization: server.organization || '',
            description: server.description || '',
            tools: server.tools && Array.isArray(server.tools) ? server.tools : [{ name: '', description: '' }],
            usageTips: server.usageTips || '',
            version: server.version || '',
            repositoryUrl: server.repositoryUrl || '',
            iconUrl: server.iconUrl || '',
            category: server.category || 'other',
          })
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load server data')
        setLoading(false)
      })
  }, [serverId])

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  if (error || !serverData) {
    return <div className="p-4 text-center text-destructive">{error || 'Failed to load server'}</div>
  }

  // Reuse ServerUploadForm but with initial data and update endpoint
  return (
    <ServerUploadForm 
      initialData={serverData}
      serverId={serverId}
      onSuccess={onSuccess}
      mode="edit"
    />
  )
}
