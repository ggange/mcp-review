'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBadgeEmbed } from '@/lib/badge'

interface BadgeEmbedProps {
  serverId: string
  baseUrl: string
}

function CopyableSnippet({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context) - the snippet is still selectable
    }
  }

  return (
    <div className="relative">
      <pre className="rounded bg-muted p-3 pr-10 text-xs text-card-foreground whitespace-pre-wrap break-all">
        <code>{value}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-7 w-7"
        onClick={handleCopy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

export function BadgeEmbed({ serverId, baseUrl }: BadgeEmbedProps) {
  const embed = getBadgeEmbed(baseUrl, serverId)
  // Preview from the current deployment so it works in development and previews too
  const previewSrc = new URL(embed.imageUrl).pathname

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Maintain this server? Show its rating in your README and invite users to leave a review.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic SVG badge */}
      <img src={previewSrc} alt="MCP Review badge preview" height={20} className="h-5 w-auto" />
      <Tabs defaultValue="markdown">
        <TabsList className="h-8">
          <TabsTrigger value="markdown" className="text-xs">Markdown</TabsTrigger>
          <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
        </TabsList>
        <TabsContent value="markdown">
          <CopyableSnippet value={embed.markdown} label="Markdown snippet" />
        </TabsContent>
        <TabsContent value="html">
          <CopyableSnippet value={embed.html} label="HTML snippet" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
