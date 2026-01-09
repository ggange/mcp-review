'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCategories, getCategoryDisplayName, type ServerCategory } from '@/lib/server-categories'

interface Tool {
  name: string
  description: string
}

interface ServerUploadFormProps {
  onSuccess?: () => void
  initialData?: {
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
  serverId?: string
  mode?: 'create' | 'edit'
}

interface GitHubUser {
  username: string
  avatar: string
  name: string
}

export function ServerUploadForm({ onSuccess, initialData, serverId, mode = 'create' }: ServerUploadFormProps = {}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null)
  const [loadingGithub, setLoadingGithub] = useState(true)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    organization: initialData?.organization || '',
    description: initialData?.description || '',
    version: initialData?.version || '',
    repositoryUrl: initialData?.repositoryUrl || '',
    usageTips: initialData?.usageTips || '',
    category: (initialData?.category || 'other') as ServerCategory,
  })

  // Fetch GitHub user info on mount
  useEffect(() => {
    const fetchGithubUser = async () => {
      try {
        const response = await fetch('/api/user/github')
        if (response.ok) {
          const data = await response.json()
          setGithubUser(data)
        }
      } catch (err) {
        // Silently fail - GitHub user info is optional
      } finally {
        setLoadingGithub(false)
      }
    }

    fetchGithubUser()
  }, [])

  const [tools, setTools] = useState<Tool[]>(
    initialData?.tools && initialData.tools.length > 0 
      ? initialData.tools 
      : [{ name: '', description: '' }]
  )
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(initialData?.iconUrl || null)
  const [iconUrl, setIconUrl] = useState<string | null>(initialData?.iconUrl || null)
  const [iconError, setIconError] = useState<string | null>(null)

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIconError(null)

    // Validate file size (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setIconError('File size must be less than 2 MB')
      setIconFile(null)
      setIconPreview(null)
      return
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setIconError('File must be PNG or JPG')
      setIconFile(null)
      setIconPreview(null)
      return
    }

    setIconFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setIconPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadIcon = async (): Promise<string | null> => {
    if (!iconFile || !formData.name.trim()) {
      return null
    }

    setIsUploadingIcon(true)
    setIconError(null)

    try {
      const serverId = formData.organization.trim() 
        ? `${formData.organization.trim()}/${formData.name.trim()}`
        : formData.name.trim()
      const formDataToSend = new FormData()
      formDataToSend.append('icon', iconFile)
      formDataToSend.append('serverId', serverId)

      const response = await fetch('/api/servers/upload-icon', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to upload icon')
      }

      const data = await response.json()
      return data.url
    } catch (err) {
      setIconError(err instanceof Error ? err.message : 'Failed to upload icon')
      return null
    } finally {
      setIsUploadingIcon(false)
    }
  }

  const addTool = () => {
    setTools([...tools, { name: '', description: '' }])
  }

  const removeTool = (index: number) => {
    if (tools.length > 1) {
      setTools(tools.filter((_, i) => i !== index))
    }
  }

  const updateTool = (index: number, field: keyof Tool, value: string) => {
    const updatedTools = [...tools]
    updatedTools[index] = { ...updatedTools[index], [field]: value }
    setTools(updatedTools)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate required fields
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Name and description are required')
      return
    }

    // Validate tools
    const validTools = tools.filter(t => t.name.trim() && t.description.trim())
    if (validTools.length === 0) {
      setError('At least one tool with name and description is required')
      return
    }

    startTransition(async () => {
      try {
        // Upload icon first if provided
        let finalIconUrl = iconUrl
        if (iconFile && !iconUrl) {
          finalIconUrl = await uploadIcon()
          if (iconFile && !finalIconUrl) {
            // Icon upload failed, but continue if it was optional
            // (though we should show the error)
            return
          }
        }

        // Submit server (create or update)
        const url = mode === 'edit' && serverId 
          ? `/api/servers/${encodeURIComponent(serverId)}`
          : '/api/servers'
        const method = mode === 'edit' ? 'PATCH' : 'POST'

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            organization: formData.organization.trim() || null,
            description: formData.description.trim(),
            tools: validTools.map(t => ({
              name: t.name.trim(),
              description: t.description.trim(),
            })),
            usageTips: formData.usageTips.trim() || null,
            iconUrl: finalIconUrl || null,
            version: formData.version.trim() || null,
            repositoryUrl: formData.repositoryUrl.trim() || null,
            category: formData.category,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || `Failed to ${mode === 'edit' ? 'update' : 'upload'} server`)
        }

        setSuccess(true)
        setFormData({
          name: '',
          organization: '',
          description: '',
          version: '',
          repositoryUrl: '',
          usageTips: '',
          category: 'other',
        })
        setTools([{ name: '', description: '' }])
        setIconFile(null)
        setIconPreview(null)
        setIconUrl(null)
        
        router.refresh()
        
        // Call onSuccess callback if provided (e.g., to close dialog)
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 1000)
        } else {
          // Clear success message after 3 seconds if no callback
          setTimeout(() => setSuccess(false), 3000)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload server')
      }
    })
  }

  return (
    <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Author Field (Read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Author</Label>
            {loadingGithub ? (
              <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : githubUser ? (
              <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={githubUser.avatar} alt={githubUser.username} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {githubUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{githubUser.name}</p>
                  <p className="text-xs text-muted-foreground">@{githubUser.username}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-md border border-border bg-muted/50">
                <p className="text-sm text-muted-foreground">GitHub account not linked</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">
                Server Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., my-mcp-server"
                required
                className="bg-background border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization" className="text-muted-foreground">
                Organization (Optional)
              </Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g., my-org"
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-muted-foreground">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this server does..."
              rows={3}
              required
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Tools Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">
                Tools <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTool}
                className="text-xs"
              >
                + Add Tool
              </Button>
            </div>
            <div className="space-y-3">
              {tools.map((tool, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Tool name"
                      value={tool.name}
                      onChange={(e) => updateTool(index, 'name', e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                    <Input
                      placeholder="Tool description"
                      value={tool.description}
                      onChange={(e) => updateTool(index, 'description', e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  {tools.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTool(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              At least one tool with name and description is required
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-muted-foreground">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as ServerCategory })}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {getCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Usage Tips */}
          <div className="space-y-2">
            <Label htmlFor="usageTips" className="text-muted-foreground">
              Usage Tips & Suggestions (Optional)
            </Label>
            <Textarea
              id="usageTips"
              value={formData.usageTips}
              onChange={(e) => setFormData({ ...formData, usageTips: e.target.value })}
              placeholder="Share tips and best practices for using this server..."
              rows={3}
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Icon Upload */}
          <div className="space-y-2">
            <Label htmlFor="icon" className="text-muted-foreground">
              Icon (Optional)
            </Label>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <Input
                  id="icon"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleIconChange}
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG or JPG. Max 2 MB. Square (1:1) recommended, 256x256 or 512x512 pixels.
                </p>
                {iconError && (
                  <p className="text-xs text-destructive mt-1">{iconError}</p>
                )}
              </div>
              {iconPreview && (
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-lg overflow-hidden border border-border">
                    <img
                      src={iconPreview}
                      alt="Icon preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="version" className="text-muted-foreground">
                Version
              </Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 1.0.0"
                className="bg-background border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl" className="text-muted-foreground">
                Repository URL
              </Label>
              <Input
                id="repositoryUrl"
                type="url"
                value={formData.repositoryUrl}
                onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
                placeholder="https://github.com/..."
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Server {mode === 'edit' ? 'updated' : 'uploaded'} successfully!
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending || isUploadingIcon}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            {isPending || isUploadingIcon ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {isUploadingIcon ? 'Uploading icon...' : mode === 'edit' ? 'Updating...' : 'Uploading...'}
              </span>
            ) : (
              mode === 'edit' ? 'Update Server' : 'Upload Server'
            )}
          </Button>
        </form>
    </div>
  )
}
