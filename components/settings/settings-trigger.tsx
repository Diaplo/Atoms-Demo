"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsModal } from "./settings-modal"
import { useHasApiKey } from "@/lib/store/settings-store"
import { cn } from "@/lib/utils"

interface SettingsTriggerProps {
  className?: string
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  label?: string
}

export function SettingsTrigger({
  className,
  variant = "ghost",
  size = "icon-sm",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  label,
}: SettingsTriggerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const hasApiKey = useHasApiKey()

  const isOpen = controlledOpen ?? internalOpen
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        className={cn("relative", className)}
        aria-label={label || "Open settings"}
      >
        {label ? (
          <>
            <Settings className="size-4 mr-2" />
            {label}
          </>
        ) : (
          <Settings className="size-4" />
        )}
        {!hasApiKey && !label && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-500 animate-pulse" />
        )}
      </Button>

      <SettingsModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
