"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VersionItem } from "./version-item"
import { SaveVersionDialog } from "./save-version-dialog"
import {
  History,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  GitBranch,
  Loader2,
  AlertCircle,
} from "lucide-react"
import type { CodeVersion, CodeFiles } from "@/types"

interface VersionHistoryPanelProps {
  onRestore?: (version: CodeVersion) => void
  onSaveVersion?: (description: string) => Promise<void>
  onDeleteVersion?: (version: CodeVersion) => Promise<void> | void
  onExportVersion?: (version: CodeVersion) => Promise<void> | void
  onSelectVersion?: (versionId: string | null) => void
  currentFiles?: CodeFiles
  versions?: CodeVersion[]
  appliedVersionId?: string | null
  isLoading?: boolean
  error?: string | null
  className?: string
  defaultCollapsed?: boolean
}

export function VersionHistoryPanel({
  onRestore,
  onSaveVersion,
  onDeleteVersion,
  onExportVersion,
  onSelectVersion,
  currentFiles = {},
  versions = [],
  appliedVersionId = null,
  isLoading = false,
  error = null,
  className,
  defaultCollapsed = false,
}: VersionHistoryPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [showSaveDialog, setShowSaveDialog] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = React.useState<string | null>(
    appliedVersionId ?? versions[0]?.id ?? null
  )
  const lastAppliedVersionIdRef = React.useRef<string | null>(appliedVersionId)
  const selectedVersion = React.useMemo(
    () =>
      versions.find((version) => version.id === selectedVersionId) ??
      versions.find((version) => version.id === appliedVersionId) ??
      versions[0] ??
      null,
    [appliedVersionId, selectedVersionId, versions]
  )

  const displayedError = actionError ?? error

  React.useEffect(() => {
    const fallbackVersionId = appliedVersionId ?? versions[0]?.id ?? null
    const hasSelectedVersion = selectedVersionId
      ? versions.some((version) => version.id === selectedVersionId)
      : false

    if (lastAppliedVersionIdRef.current !== appliedVersionId) {
      lastAppliedVersionIdRef.current = appliedVersionId
      setSelectedVersionId(fallbackVersionId)
      return
    }

    if (!hasSelectedVersion && selectedVersionId !== fallbackVersionId) {
      setSelectedVersionId(fallbackVersionId)
    }
  }, [appliedVersionId, selectedVersionId, versions])

  const handleRestore = (version: CodeVersion) => {
    setActionError(null)
    onRestore?.(version)
  }

  const handleDelete = async (version: CodeVersion) => {
    try {
      setActionError(null)
      await onDeleteVersion?.(version)
    } catch (error) {
      console.error("Error deleting version:", error)
      setActionError("Failed to delete version")
    }
  }

  const handleSaveVersion = async (description: string) => {
    try {
      setActionError(null)
      await onSaveVersion?.(description)
      setShowSaveDialog(false)
    } catch (error) {
      console.error("Error saving version:", error)
      setActionError("Failed to save version")
    }
  }

  const handleExport = async (version: CodeVersion) => {
    try {
      setActionError(null)
      await onExportVersion?.(version)
    } catch (error) {
      console.error("Error exporting version:", error)
      setActionError("Failed to export version")
    }
  }

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId)
    onSelectVersion?.(versionId)
  }

  if (isCollapsed) {
    return (
      <div
        data-slot="version-history-panel-collapsed"
        className={cn(
          "flex w-12 flex-col items-center border-l border-border/50 bg-muted/30 py-4",
          "transition-all duration-300",
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
          title="Expand version history"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <History className="h-4 w-4" />
          <GitBranch className="h-4 w-4" />
          <span className="text-[10px] font-medium tabular-nums">
            {versions.length}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        data-slot="version-history-panel"
        className={cn(
          "flex min-h-0 w-[280px] shrink-0 flex-col border-l border-border/50 bg-muted/20",
          "transition-all duration-300",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 p-1.5">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Version History
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {versions.length} version{versions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsCollapsed(true)}
            title="Collapse panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-border/30 px-3 py-2">
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs font-medium"
              onClick={() => setShowSaveDialog(true)}
              disabled={Object.keys(currentFiles).length === 0}
            >
              <Save className="h-3.5 w-3.5" />
              Save Current Version
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs font-medium"
              onClick={() => {
                if (selectedVersion) {
                  void handleExport(selectedVersion)
                }
              }}
              disabled={!selectedVersion}
            >
              <Download className="h-3.5 w-3.5" />
              Export Selected Version
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-sm">Loading versions...</span>
              </div>
            )}

            {displayedError && !isLoading && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{displayedError}</span>
              </div>
            )}

            {!isLoading && !displayedError && versions.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 rounded-full bg-muted/50 p-3">
                  <GitBranch className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  No versions yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Generate code to create your first version
                </p>
              </div>
            )}

            {!isLoading && !displayedError && versions.length > 0 && (
              versions.map((version, index) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isLatest={index === 0}
                  isCurrent={appliedVersionId === version.id}
                  isSelected={selectedVersionId === version.id}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                  onExport={handleExport}
                  onSelect={(selected) => handleSelectVersion(selected.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {versions.length > 0 && (
          <div className="border-t border-border/30 bg-muted/10 px-3 py-2">
            <p className="text-center text-[10px] text-muted-foreground/70">
              Select a version to export it, or restore it to apply it
            </p>
          </div>
        )}
      </div>

      <SaveVersionDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveVersion}
      />
    </>
  )
}
