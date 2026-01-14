'use client'

import React, { useState, useTransition, useEffect, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { RatingDisplay } from '@/components/rating/rating-display'
import { ServerIcon } from '@/components/server/server-icon'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { ServerWithRatings } from '@/types'

// Lazy load the heavy form component
const ServerUploadForm = dynamic(() => import('./server-upload-form').then(mod => ({ default: mod.ServerUploadForm })), {
  loading: () => <div className="p-4 text-center">Loading...</div>,
})

interface ServerCardWithActionsProps {
  server: ServerWithRatings
}

function ServerCardWithActionsComponent({ server }: ServerCardWithActionsProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const toolsCount = server.tools && Array.isArray(server.tools) ? server.tools.length : 0

  // Memoize delete handler to prevent unnecessary re-renders
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
      return
    }

    setDeleteError(null)
    startDeleteTransition(async () => {
      try {
        const response = await fetch(`/api/servers/${encodeURIComponent(server.id)}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to delete server')
        }

        router.refresh()
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete server')
      }
    })
  }, [server.id, router])

  // Memoize edit dialog toggle
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditDialogOpen(true)
  }, [])

  const handleEditSuccess = useCallback(() => {
    setIsEditDialogOpen(false)
    router.refresh()
  }, [router])

  return (
    <div className="relative">
      <Link href={`/servers/${encodeURIComponent(server.id)}`}>
        <Card className="group h-full cursor-pointer border-2 border-dashed border-violet-500/30 bg-card/50 transition-all hover:border-violet-500/50 hover:shadow-md gap-2">
          <CardHeader className="pb-0 overflow-hidden">
            <div className="flex items-start gap-4 w-full min-w-0">
              {/* Icon or Avatar */}
              <ServerIcon iconUrl={server.iconUrl} name={server.name} size={48} />
              
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="truncate text-lg font-semibold text-card-foreground group-hover:text-foreground">
                  {server.name}
                </h3>
                <p className="truncate text-sm text-muted-foreground">
                  {server.authorUsername && server.userId ? (
                    <Link
                      href={`/users/${server.userId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline transition-colors"
                    >
                      @{server.authorUsername}
                    </Link>
                  ) : server.authorUsername ? (
                    <span className="ml-1">@{server.authorUsername}</span>
                  ) : null}
                {server.organization 
                    ? ` (${server.organization})`
                    : ``
                  }
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col flex-1 pt-0">
            {server.description ? (
              <div className="mb-2 flex items-start gap-2">
                <p className="line-clamp-2 text-sm text-muted-foreground flex-1">
                  {server.description}
                </p>
                {server.source === 'registry' && (server.description.endsWith('...') || server.description.endsWith('…')) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-red-500 text-red-500 font-bold text-xs cursor-help shrink-0">!</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Complete description was not uploaded by the author</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            ) : (
              <p className="mb-2 text-sm italic text-muted-foreground/70">
                No description available
              </p>
            )}

            <div className="flex items-center justify-between mt-auto">
              <RatingDisplay
                trustworthiness={server.avgTrustworthiness}
                usefulness={server.avgUsefulness}
                totalRatings={server.totalRatings}
                compact
              />
              
              <div className="flex gap-2">
                {server.hasManyTools ? (
                  <Badge variant="outline" className="border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30">
                    5+ tools
                  </Badge>
                ) : toolsCount > 0 ? (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {toolsCount} {toolsCount === 1 ? 'tool' : 'tools'}
                  </Badge>
                ) : null}
                {server.version && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    v{server.version}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Action buttons overlay */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditClick}
              className="h-7 px-2 text-xs"
            >
              Edit
            </Button>
          </DialogTrigger>
          {isEditDialogOpen && (
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Server</DialogTitle>
              </DialogHeader>
              <ServerEditForm 
                serverId={server.id} 
                onSuccess={handleEditSuccess} 
              />
            </DialogContent>
          )}
        </Dialog>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-7 px-2 text-xs"
        >
          {isDeleting ? '...' : '×'}
        </Button>
      </div>

      {deleteError && (
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-xs text-destructive bg-background/90 p-1 rounded">{deleteError}</p>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const ServerCardWithActions = memo(ServerCardWithActionsComponent)

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
  hasManyTools?: boolean
  completeToolsUrl?: string
}

const ServerEditForm = memo(function ServerEditForm({ serverId, onSuccess }: ServerEditFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [serverData, setServerData] = useState<ServerFormData | null>(null)
  const [serverSource, setServerSource] = useState<'registry' | 'user' | 'official' | null>(null)
  const [loading, setLoading] = useState(true)

  // Load server data - use AbortController for cleanup
  useEffect(() => {
    const abortController = new AbortController()
    
    fetch(`/api/servers/${encodeURIComponent(serverId)}`, {
      signal: abortController.signal,
    })
      .then(res => res.json())
      .then(data => {
        if (abortController.signal.aborted) return
        
        if (data.data) {
          const server = data.data
          setServerSource(server.source || null)
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
            hasManyTools: server.hasManyTools || false,
            completeToolsUrl: server.completeToolsUrl || '',
          })
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError('Failed to load server data')
        setLoading(false)
      })

    return () => {
      abortController.abort()
    }
  }, [serverId])

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  if (error || !serverData) {
    return <div className="p-4 text-center text-destructive">{error || 'Failed to load server'}</div>
  }

  return (
    <ServerUploadForm 
      initialData={serverData}
      serverId={serverId}
      onSuccess={onSuccess}
      mode="edit"
      serverSource={serverSource || undefined}
    />
  )
})
