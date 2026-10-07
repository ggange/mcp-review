'use client'

import Image from 'next/image'

export function Logo() {
  return (
    <div 
      className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shrink-0"
      suppressHydrationWarning
    >
      <Image 
        src="/icon.svg" 
        alt="MCP Review" 
        width={32} 
        height={32} 
        className="h-full w-full object-contain"
        priority
        unoptimized
        suppressHydrationWarning
      />
    </div>
  )
}
