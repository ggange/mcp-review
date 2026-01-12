'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
import { Sparkles, Upload, Download, FileText } from 'lucide-react'
import type { GitHubRepoParseResult } from '@/types'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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
    hasManyTools?: boolean
    completeToolsUrl?: string
  }
  serverId?: string
  mode?: 'create' | 'edit'
  serverSource?: 'registry' | 'user' | 'official'
}

interface GitHubUser {
  username: string
  avatar: string
  name: string
}

export function ServerUploadForm({ onSuccess, initialData, serverId, mode = 'create', serverSource }: ServerUploadFormProps = {}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null)
  const [loadingGithub, setLoadingGithub] = useState(true)
  const [isFetchingRepo, setIsFetchingRepo] = useState(false)
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false)
  const [toolsFileError, setToolsFileError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    organization: initialData?.organization || '',
    description: initialData?.description || '',
    version: initialData?.version || '',
    repositoryUrl: initialData?.repositoryUrl || '',
    usageTips: initialData?.usageTips || '',
    category: (initialData?.category || 'other') as ServerCategory,
    hasManyTools: initialData?.hasManyTools || false,
    completeToolsUrl: initialData?.completeToolsUrl || '',
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
      } catch {
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

  /**
   * Extract tools from a markdown file content
   * Uses the same logic as the API endpoint
   */
  const extractToolsFromMarkdown = (content: string): Array<{ name: string; description: string }> => {
    const extractedTools: Array<{ name: string; description: string }> = []
    
    // Strategy 1: Detailed format with ### headers
    const detailedToolRegex = /###\s+`?([^`\n]+)`?\s*\n([\s\S]*?)(?=###|---|$)/g
    let match
    while ((match = detailedToolRegex.exec(content)) !== null) {
      const name = match[1].trim()
      const description = match[2].trim()
      
      // Extract description from the content
      const lines = description.split('\n')
      let descText = ''
      for (const line of lines) {
        const trimmed = line.trim()
        // Skip empty lines, code blocks, parameter lists, examples
        if (trimmed && 
            !trimmed.startsWith('**Arguments:**') &&
            !trimmed.startsWith('**Parameters:**') &&
            !trimmed.startsWith('**Example:**') &&
            !trimmed.startsWith('```') &&
            !trimmed.startsWith('- `') &&
            !trimmed.match(/^[A-Z][a-z]+ \(/)) {
          descText += trimmed + ' '
          if (descText.length > 200) break
        }
        // Stop at first code block or parameter section
        if (trimmed.startsWith('**Arguments:**') || trimmed.startsWith('**Parameters:**') || trimmed.startsWith('```')) {
          break
        }
      }
      
      if (name && descText.trim().length > 5) {
        extractedTools.push({ name, description: descText.trim() })
      }
    }
    
    // Strategy 2: Simple list format (- **tool_name**: description)
    if (extractedTools.length === 0) {
      const listItemRegex = /[-*]\s*\*\*`?([^`*\n]+)`?\*\*[:\-]?\s*(.+?)(?=\n[-*]|\n\n|$)/g
      while ((match = listItemRegex.exec(content)) !== null) {
        const name = match[1].trim()
        const description = match[2].trim()
        if (name && description && description.length > 5) {
          extractedTools.push({ name, description })
        }
      }
    }
    
    return extractedTools
  }

  const handleToolsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setToolsFileError(null)

    // Validate file type
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      setToolsFileError('Please upload a Markdown file (.md or .markdown)')
      return
    }

    try {
      const content = await file.text()
      const extractedTools = extractToolsFromMarkdown(content)

      if (extractedTools.length === 0) {
        setToolsFileError('No tools found in the file. Please check the format matches the example.')
        return
      }

      // Update tools with extracted data
      setTools(extractedTools)
      setToolsDialogOpen(false)
      setError(null) // Clear any previous errors
    } catch (err) {
      setToolsFileError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }

  const handleDownloadExample = async () => {
    try {
      // Fetch the example file from the public directory
      const response = await fetch('/example_TOOLS.md')
      if (response.ok) {
        const content = await response.text()
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'example_TOOLS.md'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // Fallback: create blob with example content
        const exampleContent = `# Tools Documentation

This file documents all available tools provided by this MCP server.

## Tools

### \`search_web\`

Searches the web for information using a search engine. Returns relevant results with titles, URLs, and snippets.

**Arguments:**
- \`query\` (string, required): The search query
- \`max_results\` (number, optional): Maximum number of results to return (default: 10)

**Example:**
\`\`\`json
{
  "query": "latest TypeScript features",
  "max_results": 5
}
\`\`\`

---

### \`fetch_url\`

Fetches content from a URL and returns the HTML or text content.

**Arguments:**
- \`url\` (string, required): The URL to fetch
- \`timeout\` (number, optional): Request timeout in seconds (default: 30)

**Example:**
\`\`\`json
{
  "url": "https://example.com/article",
  "timeout": 10
}
\`\`\`

---

### \`summarize_text\`

Summarizes long text content into a concise summary.

**Arguments:**
- \`text\` (string, required): The text to summarize
- \`max_length\` (number, optional): Maximum length of summary in words (default: 100)

**Example:**
\`\`\`json
{
  "text": "Long article content here...",
  "max_length": 50
}
\`\`\`

---

## Alternative Format

You can also list tools in a simpler format:

- **\`tool_name\`**: Brief description of what the tool does
- **\`another_tool\`**: Another tool description
- **\`yet_another\`**: Yet another tool with its description
`
        const blob = new Blob([exampleContent], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'example_TOOLS.md'
        document.body.appendChild(a)  
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Failed to download example file:', err)
    }
  }

  const handleImportFromGitHub = async () => {
    const repoUrl = formData.repositoryUrl.trim()
    
    if (!repoUrl) {
      setError('Please enter a GitHub repository URL first')
      return
    }
    
    // Basic validation for GitHub URL
    const githubUrlRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/
    if (!githubUrlRegex.test(repoUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)')
      return
    }
    
    setIsFetchingRepo(true)
    setError(null)
    
    try {
      const response = await fetch('/api/servers/parse-github-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryUrl: repoUrl }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to fetch repository data')
      }
      
      const data: GitHubRepoParseResult = await response.json()
      
      // Populate form with fetched data
      setFormData({
        name: data.name || formData.name,
        organization: data.organization || formData.organization,
        description: data.description || formData.description,
        version: data.version || formData.version,
        repositoryUrl: data.repositoryUrl || formData.repositoryUrl,
        usageTips: data.usageTips || formData.usageTips,
        category: (data.category || formData.category) as ServerCategory,
        hasManyTools: formData.hasManyTools,
        completeToolsUrl: formData.completeToolsUrl,
      })
      
      if (data.tools && data.tools.length > 0) {
        setTools(data.tools)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data')
    } finally {
      setIsFetchingRepo(false)
    }
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

    // For official servers, organization is required
    const isOfficialServer = mode === 'edit' && serverSource === 'official'
    if (isOfficialServer && !formData.organization.trim()) {
      setError('Organization is required for official servers')
      return
    }

    // Validate tools only if hasManyTools is not checked
    const validTools = tools.filter(t => t.name.trim() && t.description.trim())
    if (!formData.hasManyTools) {
      if (validTools.length === 0) {
        setError('At least one tool with name and description is required, or check "Has 5+ tools" and provide a URL')
        return
      }
    }

    // Validate complete tools URL if hasManyTools is checked
    if (formData.hasManyTools && !formData.completeToolsUrl.trim()) {
      setError('Complete tools URL is required when "Has 5+ tools" is checked')
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

        // For official servers, organization is required
        const isOfficialServerEdit = mode === 'edit' && serverSource === 'official'

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            organization: isOfficialServerEdit ? formData.organization.trim() : (formData.organization.trim() || null),
            description: formData.description.trim(),
            tools: formData.hasManyTools ? [] : validTools.map(t => ({
              name: t.name.trim(),
              description: t.description.trim(),
            })),
            usageTips: formData.usageTips.trim() || null,
            iconUrl: finalIconUrl || null,
            version: formData.version.trim() || null,
            repositoryUrl: formData.repositoryUrl.trim() || null,
            category: formData.category,
            hasManyTools: formData.hasManyTools,
            completeToolsUrl: formData.hasManyTools ? (formData.completeToolsUrl.trim() || null) : null,
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
          hasManyTools: false,
          completeToolsUrl: '',
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

          {/* Repository URL with Import button */}
          <div className="space-y-2">
            <Label htmlFor="repositoryUrl" className="text-muted-foreground">
              Repository URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="repositoryUrl"
                type="url"
                value={formData.repositoryUrl}
                onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
                placeholder="https://github.com/..."
                className="bg-background border-border text-foreground flex-1"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleImportFromGitHub}
                      disabled={isFetchingRepo || !formData.repositoryUrl.trim()}
                      className="gap-2"
                    >
                      {isFetchingRepo ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Import from GitHub
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={5}>
                  <p>Auto-fill the form with repository information</p>
                </TooltipContent>
              </Tooltip>
            </div>
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
                Organization {mode === 'edit' && serverSource === 'official' ? '(Required)' : '(Optional)'}
              </Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g., my-org"
                required={mode === 'edit' && serverSource === 'official'}
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
              <div className="flex items-center gap-3">
                <Label className="text-muted-foreground">
                  Tools {!formData.hasManyTools && <span className="text-destructive">*</span>}
                </Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasManyTools"
                    checked={formData.hasManyTools}
                    onChange={(e) => setFormData({ ...formData, hasManyTools: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500"
                  />
                  <Label htmlFor="hasManyTools" className="text-sm font-medium text-foreground cursor-pointer">
                    Has 5+ tools
                  </Label>
                </div>
              </div>
              {!formData.hasManyTools && (
              <div className="flex gap-2">
                <Dialog open={toolsDialogOpen} onOpenChange={setToolsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      Upload Tools File
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Tools Markdown File</DialogTitle>
                      <DialogDescription>
                        Upload a markdown file containing your tool definitions. The file will be parsed to extract tool names and descriptions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="tools-file" className="text-sm">
                          Select Markdown File
                        </Label>
                        <Input
                          id="tools-file"
                          type="file"
                          accept=".md,.markdown"
                          onChange={handleToolsFileUpload}
                          className="bg-background border-border text-foreground"
                        />
                        {toolsFileError && (
                          <p className="text-xs text-destructive">{toolsFileError}</p>
                        )}
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Need an example?</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Download the example file to see the supported format.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadExample}
                          className="w-full gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Example File
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
              )}
            </div>
            {!formData.hasManyTools ? (
              <>
                <div className="space-y-3">
                  {tools.map((tool, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 rounded-md border border-border bg-muted/30">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Tool name"
                          value={tool.name}
                          onChange={(e) => updateTool(index, 'name', e.target.value)}
                          className="bg-background border-border text-foreground"
                        />
                        <Textarea
                          placeholder="Tool description - describe what this tool does..."
                          value={tool.description}
                          onChange={(e) => updateTool(index, 'description', e.target.value)}
                          className="bg-background border-border text-foreground min-h-[60px] resize-y"
                          rows={2}
                        />
                      </div>
                      {tools.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTool(index)}
                          className="text-destructive hover:text-destructive mt-1"
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
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="completeToolsUrl" className="text-muted-foreground">
                  Complete Tools List URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="completeToolsUrl"
                  type="url"
                  value={formData.completeToolsUrl}
                  onChange={(e) => setFormData({ ...formData, completeToolsUrl: e.target.value })}
                  placeholder="https://example.com/tools"
                  className="bg-background border-border text-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Provide a URL to the complete list of tools (e.g., documentation page, tools list)
                </p>
              </div>
            )}
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
                    <Image
                      src={iconPreview}
                      alt="Icon preview"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
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
