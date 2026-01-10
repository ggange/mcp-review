'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { RatingDisplay } from '@/components/rating/rating-display'
import { getAvatarColor } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ServerUploadForm } from './server-upload-form'
import type { ServerWithRatings } from '@/types'

interface ServerCardWithActionsProps {
  server: ServerWithRatings
}

export function ServerCardWithActions({ server }: ServerCardWithActionsProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const initial = server.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(server.name)
  const toolsCount = server.tools && Array.isArray(server.tools) ? server.tools.length : 0

  const handleDelete = (e: React.MouseEvent) => {
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
  }

  return (
    <div className="relative">
      <Link href={`/servers/${encodeURIComponent(server.id)}`}>
        <Card className="group h-full cursor-pointer border-2 border-dashed border-violet-500/30 bg-card/50 transition-all hover:border-violet-500/50 hover:shadow-md">
          <CardHeader className="pb-3 overflow-hidden">
            <div className="flex items-start gap-4 w-full min-w-0">
              {/* Icon or Avatar */}
              {server.iconUrl ? (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border">
                  <Image
                    src={server.iconUrl}
                    alt={server.name}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor}`}
                >
                  <span className="text-xl font-bold text-white">{initial}</span>
                </div>
              )}
              
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="truncate text-lg font-semibold text-card-foreground group-hover:text-foreground">
                  {server.name}
                </h3>
                <p className="truncate text-sm text-muted-foreground">
                  {server.authorUsername && (
                    <span className="ml-1">@{server.authorUsername}</span>
                  )}
                {server.organization 
                    ? ` (${server.organization})`
                    : ``
                  }
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {server.description ? (
              <div className="mb-4 flex items-start gap-2">
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
              <p className="mb-4 text-sm italic text-muted-foreground/70">
                No description available
              </p>
            )}

            <div className="flex items-center justify-between">
              <RatingDisplay
                trustworthiness={server.avgTrustworthiness}
                usefulness={server.avgUsefulness}
                totalRatings={server.totalRatings}
                compact
              />
              
              <div className="flex gap-2">
                {toolsCount > 0 && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {toolsCount} {toolsCount === 1 ? 'tool' : 'tools'}
                  </Badge>
                )}
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="h-7 px-2 text-xs"
            >
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Server</DialogTitle>
            </DialogHeader>
            <ServerEditForm 
              serverId={server.id} 
              onSuccess={() => {
                setIsEditDialogOpen(false)
                router.refresh()
              }} 
            />
          </DialogContent>
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

  return (
    <ServerUploadForm 
      initialData={serverData}
      serverId={serverId}
      onSuccess={onSuccess}
      mode="edit"
    />
  )
}
