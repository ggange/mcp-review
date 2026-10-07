'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  generateRatingBadge,
  getBadgeEmbed,
  getReviewInvitation,
  sanitizeCustomText,
  DEFAULT_NO_RATINGS_TEXT,
  MAX_CUSTOM_TEXT_LENGTH,
} from '@/lib/badge'

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
  const [noReviewsText, setNoReviewsText] = useState('')
  const embed = getBadgeEmbed(baseUrl, serverId, { text: noReviewsText })
  // Live badge from the current deployment (works in development and previews too);
  // without the message so typing doesn't refetch it on every keystroke
  const previewSrc = new URL(getBadgeEmbed(baseUrl, serverId).imageUrl).pathname
  const invitation = getReviewInvitation(baseUrl)

  // The live badge ignores the message once a server has reviews, so render the
  // no-reviews version locally to show what new visitors will see before that
  const customText = sanitizeCustomText(noReviewsText)
  const noReviewsPreview = customText
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generateRatingBadge({ avgRating: 0, totalRatings: 0, noRatingsText: customText }))}`
    : null

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Maintain this server? Show its rating in your README and invite users to leave a review.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic SVG badge */}
      <img src={previewSrc} alt="MCP Review badge preview" height={20} className="h-5 w-auto" />

      <div className="space-y-2">
        <Label htmlFor="badge-no-reviews-text" className="text-xs">
          Message until the first review <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="badge-no-reviews-text"
          value={noReviewsText}
          onChange={(e) => setNoReviewsText(e.target.value)}
          placeholder={DEFAULT_NO_RATINGS_TEXT}
          maxLength={MAX_CUSTOM_TEXT_LENGTH}
          className="h-8 text-xs"
        />
        {noReviewsText !== invitation && (
          <button
            type="button"
            onClick={() => setNoReviewsText(invitation)}
            className="text-xs text-primary hover:underline"
          >
            Use &ldquo;{invitation}&rdquo;
          </button>
        )}
        {noReviewsPreview && (
          // eslint-disable-next-line @next/next/no-img-element -- locally rendered SVG preview
          <img src={noReviewsPreview} alt={`Badge before the first review: ${customText}`} height={20} className="h-5 w-auto" />
        )}
      </div>

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
