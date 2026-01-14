"use client"

import { useState } from 'react'
import Image from 'next/image'
import { getAvatarColor } from '@/lib/utils'

interface ServerIconProps {
  iconUrl: string | null | undefined
  name: string
  size?: number
  className?: string
  priority?: boolean
}

/**
 * Server icon component that handles image loading errors gracefully
 * Falls back to avatar when image fails to load to prevent hydration mismatches
 */
export function ServerIcon({ 
  iconUrl, 
  name, 
  size = 48, 
  className = '',
  priority = false 
}: ServerIconProps) {
  const [imageError, setImageError] = useState(false)
  const initial = name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(name)

  // If no iconUrl or image error occurred, show avatar
  if (!iconUrl || imageError) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor} ${className}`}
        style={{ width: size, height: size }}
      >
        <span 
          className="font-bold text-white"
          style={{ fontSize: size * 0.5 }}
        >
          {initial}
        </span>
      </div>
    )
  }

  return (
    <div 
      className={`flex shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconUrl}
        alt={name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized
        priority={priority}
        onError={() => setImageError(true)}
      />
    </div>
  )
}
