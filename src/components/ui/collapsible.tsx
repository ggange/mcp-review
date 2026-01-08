"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  trigger?: React.ReactNode
  className?: string
}

export function Collapsible({ 
  children, 
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  title,
  trigger,
  className 
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  
  const setIsOpen = React.useCallback((open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open)
    } else {
      setInternalOpen(open)
    }
  }, [isControlled, onOpenChange])
  const contentRef = React.useRef<HTMLDivElement>(null)
  const initialOpen = isControlled ? (controlledOpen ?? false) : defaultOpen
  const [height, setHeight] = React.useState<number | "auto">(initialOpen ? "auto" : 0)

  React.useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setHeight(contentRef.current.scrollHeight)
      } else {
        setHeight(0)
      }
    }
  }, [isOpen])

  return (
    <div className={cn("w-full", className)}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      ) : title ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between py-4 text-left"
          aria-expanded={isOpen}
          aria-controls="collapsible-content"
        >
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      ) : null}
      <div
        id="collapsible-content"
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: height === "auto" ? "none" : `${height}px`,
        }}
      >
        <div>{children}</div>
      </div>
    </div>
  )
}

