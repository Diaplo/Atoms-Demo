"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { formatTimeAgo, formatDateTime } from "@/lib/utils/index"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Clock,
  Download,
  RotateCcw,
  MoreVertical,
  Trash2,
  GitBranch,
  Save,
  Sparkles,
} from "lucide-react"
import type { CodeVersion } from "@/types"

interface VersionItemProps {
  version: CodeVersion
  isLatest?: boolean
  isCurrent?: boolean
  isSelected?: boolean
  onRestore: (version: CodeVersion) => void
  onDelete: (version: CodeVersion) => void
  onExport?: (version: CodeVersion) => Promise<void> | void
  onSelect?: (version: CodeVersion) => void
  className?: string
}

export function VersionItem({
  version,
  isLatest = false,
  isCurrent = false,
  isSelected = false,
  onRestore,
  onDelete,
  onExport,
  onSelect,
  className,
}: VersionItemProps) {
  const handleRestoreButton = (event: React.MouseEvent) => {
    event.stopPropagation()
    onRestore(version)
  }

  const handleRestoreMenuAction = (event: React.MouseEvent) => {
    event.stopPropagation()
    onRestore(version)
  }

  const handleDeleteMenuAction = (event: React.MouseEvent) => {
    event.stopPropagation()
    onDelete(version)
  }

  const handleExportMenuAction = (event: React.MouseEvent) => {
    event.stopPropagation()
    void onExport?.(version)
  }

  const versionMenuItemClass =
    "border border-transparent hover:border-zinc-950 data-[highlighted]:border-zinc-950 dark:hover:border-zinc-100 dark:data-[highlighted]:border-zinc-100"

  return (
    <div
      data-slot="version-item"
      onClick={() => onSelect?.(version)}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all duration-200",
        "border border-transparent hover:border-border/50 hover:bg-muted/30",
        "dark:hover:bg-muted/20",
        isSelected && [
          "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5",
          "border-primary/20 ring-1 ring-primary/10",
          "dark:from-primary/10 dark:via-primary/15 dark:to-primary/10",
        ],
        className
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-all duration-300",
            isCurrent
              ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 dark:shadow-emerald-500/20"
              : version.isManual
                ? "bg-gradient-to-br from-amber-400 to-amber-600"
                : "bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/60"
          )}
        />
        {isCurrent && (
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            v{version.version}
          </span>

          <Badge
            variant="outline"
            className={cn(
              "h-4 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide",
              "transition-colors",
              version.isManual
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-muted-foreground/30 bg-muted-foreground/5 text-muted-foreground"
            )}
          >
            {version.isManual ? (
              <Save className="mr-0.5 h-2.5 w-2.5" />
            ) : (
              <Sparkles className="mr-0.5 h-2.5 w-2.5" />
            )}
            {version.isManual ? "Manual" : "Auto"}
          </Badge>

          {isLatest && (
            <Badge
              variant="outline"
              className="h-4 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
            >
              Latest
            </Badge>
          )}
        </div>

        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimeAgo(version.createdAt)}</span>
          <span className="text-border">•</span>
          <span className="truncate" title={formatDateTime(version.createdAt)}>
            {formatDateTime(version.createdAt)}
          </span>
        </div>

        {version.isManual && version.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
            {version.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <GitBranch className="h-3 w-3" />
          <span>
            {Object.keys(version.files).length} file
            {Object.keys(version.files).length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleRestoreButton}
          className="text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          title="Restore this version"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-40 bg-white dark:bg-zinc-950"
          >
            <DropdownMenuItem
              className={versionMenuItemClass}
              onClick={handleRestoreMenuAction}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore version
            </DropdownMenuItem>
            <DropdownMenuItem
              className={versionMenuItemClass}
              onClick={handleExportMenuAction}
            >
              <Download className="mr-2 h-4 w-4" />
              Export code
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={versionMenuItemClass}
              variant="destructive"
              onClick={handleDeleteMenuAction}
              disabled={isLatest}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete version
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
