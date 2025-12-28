'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ServerUploadForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    description: '',
    version: '',
    repositoryUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.name.trim() || !formData.organization.trim()) {
      setError('Name and organization are required')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/servers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            organization: formData.organization.trim(),
            description: formData.description.trim() || null,
            version: formData.version.trim() || null,
            repositoryUrl: formData.repositoryUrl.trim() || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to upload server')
        }

        setSuccess(true)
        setFormData({
          name: '',
          organization: '',
          description: '',
          version: '',
          repositoryUrl: '',
        })
        
        router.refresh()
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload server')
      }
    })
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100">Upload New Server</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Server Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., my-mcp-server"
                required
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization" className="text-slate-300">
                Organization <span className="text-red-400">*</span>
              </Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g., my-org"
                required
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this server does..."
              rows={3}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="version" className="text-slate-300">
                Version
              </Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 1.0.0"
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl" className="text-slate-300">
                Repository URL
              </Label>
              <Input
                id="repositoryUrl"
                type="url"
                value={formData.repositoryUrl}
                onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
                placeholder="https://github.com/..."
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-400">Server uploaded successfully!</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading...
              </span>
            ) : (
              'Upload Server'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

