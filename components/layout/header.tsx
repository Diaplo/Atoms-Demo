"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border/50 bg-background/95 px-6",
        "backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Ready</span>
        </div>
        <div className="hidden sm:block text-sm font-medium text-foreground">
          Workspace
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </header>
  )
}
