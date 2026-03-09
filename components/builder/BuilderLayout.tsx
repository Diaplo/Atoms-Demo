"use client"

import * as React from "react"
import { Code, Eye, Columns, Loader2 } from "lucide-react"
import {
  SandpackProvider,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"
import { CodeEditor } from "./CodeEditor"
import { PreviewPanel } from "@/components/preview/preview-panel"
import { ChatContainer } from "@/components/chat/chat-container"
import { VersionHistoryPanel } from "@/components/history"
import { SettingsModal } from "@/components/settings/settings-modal"
import {
  useBuilderActions,
  useCurrentFiles,
  useActiveFile,
  useIsStreaming,
  useMessages,
  useVersions,
  useCurrentVersion,
} from "@/lib/store/builder-store"
import {
  useWorkspaceActiveChatId,
  useWorkspaceChatSessionKey,
  useWorkspaceHydrateVersions,
  useWorkspaceInitialMessages,
} from "@/lib/store/dashboard-workspace-store"
import {
  getPrimaryFilePath,
  hasCodeFiles,
  mergeCodeFiles,
  normalizeCodeFiles,
} from "@/lib/utils/code-files"
import {
  DEFAULT_INDEX_CODE,
  downloadCodeArchive,
  resolveBrowserSandpackBundlerUrl,
  SANDPACK_BUNDLER_URL,
  DEFAULT_STYLES_CODE,
  prepareSandpackRuntime,
} from "@/lib/sandpack/sandbox"
import type { ChatMessage, CodeFiles, CodeVersion, ViewTab } from "@/types"

const MIN_SIDEBAR_WIDTH = 280
const MAX_SIDEBAR_WIDTH = 600
const DEFAULT_SIDEBAR_WIDTH = 380

function normalizeVersion(version: any): CodeVersion {
  return {
    ...version,
    files: normalizeCodeFiles(version.files),
    createdAt: new Date(version.createdAt),
  }
}

function hydrateVersionSnapshots(versions: CodeVersion[]): CodeVersion[] {
  const snapshots = new Map<string, CodeFiles>()
  let currentSnapshot: CodeFiles = {}

  const chronologicalVersions = [...versions].sort((left, right) => left.version - right.version)

  chronologicalVersions.forEach((version) => {
    const primaryVersionFile = getPrimaryFilePath(version.files)

    currentSnapshot = version.isManual
      ? mergeCodeFiles({}, version.files, primaryVersionFile)
      : mergeCodeFiles(currentSnapshot, version.files, primaryVersionFile)

    snapshots.set(version.id, currentSnapshot)
  })

  return versions.map((version) => ({
    ...version,
    files: snapshots.get(version.id) ?? version.files,
  }))
}

function isDefaultRuntimeFile(path: string, code: string) {
  if (path === "/index.tsx") {
    return code.trim() === DEFAULT_INDEX_CODE.trim()
  }

  if (path === "/styles.css") {
    return code.trim() === DEFAULT_STYLES_CODE.trim()
  }

  return false
}

function getVisibleEditorFiles(files: CodeFiles, activeFile: string | null) {
  const filePaths = Object.keys(files)

  if (filePaths.length <= 1) {
    return filePaths
  }

  const visibleFiles = filePaths.filter((path) => {
    const file = files[path]
    return !file.readOnly && !isDefaultRuntimeFile(path, file.code)
  })

  if (visibleFiles.length === 0) {
    return filePaths
  }

  if (activeFile && !visibleFiles.includes(activeFile) && filePaths.includes(activeFile)) {
    return [...visibleFiles, activeFile]
  }

  return visibleFiles
}

function ViewToggle({
  activeView,
  onViewChange,
}: {
  activeView: ViewTab
  onViewChange: (view: ViewTab) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/50 p-0.5">
      <button
        onClick={() => onViewChange("code")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          activeView === "code"
            ? "bg-zinc-700/80 text-white shadow-sm"
            : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
        )}
        title="Code view"
      >
        <Code className="size-3.5" />
        <span className="hidden sm:inline">Code</span>
      </button>
      <button
        onClick={() => onViewChange("split")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          activeView === "split"
            ? "bg-zinc-700/80 text-white shadow-sm"
            : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
        )}
        title="Split view"
      >
        <Columns className="size-3.5" />
        <span className="hidden sm:inline">Split</span>
      </button>
      <button
        onClick={() => onViewChange("preview")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          activeView === "preview"
            ? "bg-zinc-700/80 text-white shadow-sm"
            : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
        )}
        title="Preview view"
      >
        <Eye className="size-3.5" />
        <span className="hidden sm:inline">Preview</span>
      </button>
    </div>
  )
}

function ResizeHandle({
  isResizing,
  onMouseDown,
}: {
  isResizing: boolean
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={cn(
        "group relative flex w-2 cursor-col-resize items-center justify-center bg-transparent transition-colors",
        isResizing ? "bg-violet-500/30" : "hover:bg-violet-500/10"
      )}
      onMouseDown={onMouseDown}
    >
      <div className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 transition-opacity",
        "group-hover:opacity-100",
        isResizing && "opacity-100"
      )}>
        <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
      </div>
      
      <div className={cn(
        "absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-transparent transition-colors",
        isResizing ? "bg-violet-500" : "group-hover:bg-violet-500/50"
      )} />
    </div>
  )
}

function BuilderContent({
  activeView,
  onViewChange,
  isStreaming,
  isHydratingHistory,
  onRequestPreviewSessionReset,
  currentFiles,
  activeFile,
  onFileChange,
  onCodeChange,
  useSharedProvider,
}: {
  activeView: ViewTab
  onViewChange: (view: ViewTab) => void
  isStreaming: boolean
  isHydratingHistory: boolean
  onRequestPreviewSessionReset: () => void
  currentFiles: CodeFiles
  activeFile: string | null
  onFileChange: (path: string) => void
  onCodeChange: (path: string, code: string) => void
  useSharedProvider: boolean
}) {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full",
              isStreaming ? "animate-pulse bg-yellow-500" : "bg-emerald-500"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {isStreaming ? "Generating..." : "Ready"}
          </span>
        </div>

        <ViewToggle activeView={activeView} onViewChange={onViewChange} />

        <div className="w-14" />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {(activeView === "code" || activeView === "split") && (
          <div
            className={cn(
              "flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-border/50",
              activeView === "split" ? "w-1/2" : "flex-1"
            )}
          >
            <CodeEditor
              files={currentFiles}
              activeFile={activeFile}
              onFileChange={onFileChange}
              onCodeChange={onCodeChange}
              className="flex-1"
              useSharedProvider={useSharedProvider}
            />
          </div>
        )}

        <div
          className={cn(
            "relative h-full min-h-0 min-w-0 flex-col overflow-hidden",
            activeView === "code"
              ? "hidden"
              : activeView === "split"
                ? "flex w-1/2"
                : "flex flex-1"
          )}
        >
          <PreviewPanel
            files={currentFiles}
            className="h-full rounded-none border-0"
            useSharedProvider={useSharedProvider}
            onRequestSessionReset={onRequestPreviewSessionReset}
          />
          {isHydratingHistory && (
            <div className="absolute inset-0 z-50 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-none border-0 bg-zinc-950/94 backdrop-blur-sm">
              <div className="flex h-full min-h-0 items-center justify-center px-6 text-center">
                <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-5 shadow-xl">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      Loading chat code
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Preview will start after the saved files finish loading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface BuilderLayoutProps {
  className?: string
  defaultView?: ViewTab
}

export function BuilderLayout({ className, defaultView = "split" }: BuilderLayoutProps) {
  const [activeView, setActiveView] = React.useState<ViewTab>(defaultView)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [sidebarWidth, setSidebarWidth] = React.useState(DEFAULT_SIDEBAR_WIDTH)
  const [isResizing, setIsResizing] = React.useState(false)
  const [versionsLoading, setVersionsLoading] = React.useState(false)
  const [versionsError, setVersionsError] = React.useState<string | null>(null)
  const [hydratedChatId, setHydratedChatId] = React.useState<string | null>(null)
  const [bundlerUrl, setBundlerUrl] = React.useState(SANDPACK_BUNDLER_URL)
  const [previewSessionToken, setPreviewSessionToken] = React.useState(0)
  const dragStartXRef = React.useRef(0)
  const dragStartWidthRef = React.useRef(0)
  const versionsRequestIdRef = React.useRef(0)

  const currentFiles = useCurrentFiles()
  const activeFile = useActiveFile()
  const isStreaming = useIsStreaming()
  const messages = useMessages()
  const versions = useVersions()
  const appliedVersion = useCurrentVersion()
  const activeChatId = useWorkspaceActiveChatId()
  const initialMessages = useWorkspaceInitialMessages()
  const chatContainerKey = useWorkspaceChatSessionKey()
  const hydrateVersions = useWorkspaceHydrateVersions()
  const {
    setActiveFile,
    updateFile,
    clearFiles,
    setVersions,
    addVersion,
    selectVersion,
    restoreVersion,
    deleteVersion,
    clearVersions,
  } = useBuilderActions()
  const normalizedInitialMessages = React.useMemo(
    () =>
      (initialMessages ?? []).map((message) => ({
        id: message.id,
        role: message.role as ChatMessage["role"],
        content: message.content,
      })),
    [initialMessages]
  )

  const handleFileChange = (path: string) => {
    setActiveFile(path)
  }

  const handleCodeChange = (path: string, code: string) => {
    updateFile(path, code)
  }

  const loadVersions = React.useCallback(
    async (chatId: string) => {
      const requestId = ++versionsRequestIdRef.current
      setVersionsLoading(true)
      setVersionsError(null)

      try {
        const response = await fetch(`/api/chats/${chatId}/versions`, {
          credentials: "same-origin",
        })

        if (!response.ok) {
          throw new Error(`Failed to load versions (${response.status})`)
        }

        const payload = await response.json()
        const normalizedVersions = Array.isArray(payload)
          ? payload.map(normalizeVersion)
          : []
        const hydratedVersions = hydrateVersionSnapshots(normalizedVersions)

        if (versionsRequestIdRef.current !== requestId) {
          return
        }

        setVersions(hydratedVersions)

        if (hydratedVersions.length > 0) {
          const latestVersion = hydratedVersions[0]
          restoreVersion(latestVersion)
          selectVersion(latestVersion.id)

          const primaryFile = getPrimaryFilePath(latestVersion.files)
          if (primaryFile) {
            setActiveFile(primaryFile)
          }
        } else {
          clearVersions()
          clearFiles()
        }
      } catch (error) {
        if (versionsRequestIdRef.current !== requestId) {
          return
        }

        console.error("Error loading versions:", error)
        setVersionsError("Failed to load version history")
        clearVersions()
        clearFiles()
      } finally {
        if (versionsRequestIdRef.current === requestId) {
          setHydratedChatId(chatId)
          setVersionsLoading(false)
        }
      }
    },
    [
      clearFiles,
      clearVersions,
      restoreVersion,
      selectVersion,
      setActiveFile,
      setVersions,
    ]
  )

  const handleRestoreVersion = React.useCallback(
    (version: CodeVersion) => {
      restoreVersion(version)
      selectVersion(version.id)

      const primaryFile = getPrimaryFilePath(version.files)
      if (primaryFile) {
        setActiveFile(primaryFile)
      }
    },
    [restoreVersion, selectVersion, setActiveFile]
  )

  const handleSaveVersion = React.useCallback(
    async (description: string) => {
      if (!activeChatId) {
        throw new Error("Create or select a chat before saving versions")
      }

      setVersionsError(null)

      const response = await fetch(`/api/chats/${activeChatId}/versions`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: currentFiles,
          isManual: true,
          description,
        }),
      })

      if (!response.ok) {
        setVersionsError("Failed to save version")
        throw new Error(`Failed to save version (${response.status})`)
      }

      const version = normalizeVersion(await response.json())
      addVersion(version)
      selectVersion(version.id)
    },
    [activeChatId, addVersion, currentFiles, selectVersion]
  )

  const handleDeleteVersion = React.useCallback(
    async (version: CodeVersion) => {
      setVersionsError(null)

      const response = await fetch(
        `/api/chats/${version.chatId}/versions/${version.id}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      )

      if (!response.ok) {
        setVersionsError("Failed to delete version")
        throw new Error(`Failed to delete version (${response.status})`)
      }

      deleteVersion(version.id)
    },
    [deleteVersion]
  )

  const handleExportVersion = React.useCallback(
    async (version: CodeVersion) => {
      try {
        setVersionsError(null)

        downloadCodeArchive(version.files, {
          filename: `ai-builder-v${version.version}`,
          packageName: `ai-builder-v${version.version}`,
          title: `AI Builder Export v${version.version}`,
        })
      } catch (error) {
        console.error("Error exporting version:", error)
        setVersionsError("Failed to export version")
        throw error
      }
    },
    []
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragStartXRef.current = e.clientX
    dragStartWidthRef.current = sidebarWidth
    setIsResizing(true)
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = e.clientX - dragStartXRef.current
      const newWidth = dragStartWidthRef.current + deltaX
      const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth))
      setSidebarWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  React.useEffect(() => {
    const resolvedBundlerUrl = resolveBrowserSandpackBundlerUrl()
    if (resolvedBundlerUrl !== bundlerUrl) {
      setBundlerUrl(resolvedBundlerUrl)
    }
  }, [bundlerUrl])

  React.useEffect(() => {
    if (!activeChatId) {
      setVersionsError(null)
      setVersionsLoading(false)
      setHydratedChatId(null)
      clearVersions()
      clearFiles()
      return
    }

    if (!hydrateVersions) {
      setVersionsError(null)
      setVersionsLoading(false)
      setHydratedChatId(activeChatId)
      clearVersions()
      return
    }

    clearVersions()
    clearFiles()
    void loadVersions(activeChatId)
  }, [activeChatId, clearFiles, clearVersions, hydrateVersions, loadVersions])

  const sandpackRuntime = React.useMemo(
    () => prepareSandpackRuntime(currentFiles, activeFile),
    [activeFile, currentFiles]
  )
  const isHydratingHistory = Boolean(
    activeChatId &&
      hydrateVersions &&
      (versionsLoading || hydratedChatId !== activeChatId)
  )
  const hasAnyFiles = React.useMemo(() => hasCodeFiles(currentFiles), [currentFiles])
  const sandpackFiles = sandpackRuntime.files
  const sandpackEntryFile = sandpackRuntime.entry
  const hasSandpackRuntime = React.useMemo(
    () => Boolean(sandpackEntryFile && Object.keys(sandpackFiles).length > 0),
    [sandpackEntryFile, sandpackFiles]
  )

  const visibleEditorFiles = React.useMemo(
    () =>
      getVisibleEditorFiles(
        Object.fromEntries(
          Object.keys(sandpackFiles).map((path) => [
            path,
            {
              code: sandpackFiles[path]?.code ?? "",
              active: sandpackFiles[path]?.active,
              readOnly: sandpackFiles[path]?.readOnly,
            },
          ])
        ),
        activeFile
      ),
    [activeFile, sandpackFiles]
  )
  const primaryActiveFile = sandpackRuntime.activeFile
  const hasActiveFileInRuntime = React.useMemo(
    () => (activeFile ? Boolean(sandpackFiles[activeFile]) : false),
    [activeFile, sandpackFiles]
  )

  React.useEffect(() => {
    if (
      hasSandpackRuntime &&
      primaryActiveFile &&
      !hasActiveFileInRuntime &&
      primaryActiveFile !== activeFile
    ) {
      setActiveFile(primaryActiveFile)
    }
  }, [
    activeFile,
    hasActiveFileInRuntime,
    hasSandpackRuntime,
    primaryActiveFile,
    setActiveFile,
  ])

  const handlePreviewSessionReset = React.useCallback(() => {
    setPreviewSessionToken((current) => current + 1)
  }, [])

  const providerOptions = React.useMemo(
    () => ({
      activeFile: primaryActiveFile ?? undefined,
      visibleFiles: visibleEditorFiles,
      autorun: false,
      autoReload: true,
      bundlerURL: bundlerUrl,
      initMode: "immediate" as const,
      recompileMode: "immediate" as const,
      classes: {
        "sp-wrapper": "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        "sp-layout": "flex h-full min-h-0 min-w-0 flex-1 overflow-hidden",
      },
    }),
    [bundlerUrl, primaryActiveFile, visibleEditorFiles]
  )
  const providerCustomSetup = React.useMemo(
    () => (sandpackEntryFile ? { entry: sandpackEntryFile } : undefined),
    [sandpackEntryFile]
  )

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 overflow-hidden bg-background", className)}>
      <div 
        className="flex min-h-0 shrink-0 flex-col border-r border-border/50"
        style={{ width: `${sidebarWidth}px` }}
      >
        <ChatContainer
          key={chatContainerKey}
          className="flex-1"
          initialMessages={normalizedInitialMessages}
          activeChatId={activeChatId}
          isHydratingHistory={isHydratingHistory}
          onSettingsClick={() => setSettingsOpen(true)}
        />
      </div>

      <ResizeHandle 
        isResizing={isResizing}
        onMouseDown={handleMouseDown}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {hasSandpackRuntime ? (
          <SandpackProvider
            key={`${bundlerUrl}:${previewSessionToken}`}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            template="react-ts"
            theme="dark"
            files={sandpackFiles}
            customSetup={providerCustomSetup}
            options={providerOptions}
          >
            <BuilderContent
              activeView={activeView}
              onViewChange={setActiveView}
              isStreaming={isStreaming}
              isHydratingHistory={isHydratingHistory}
              onRequestPreviewSessionReset={handlePreviewSessionReset}
              currentFiles={currentFiles}
              activeFile={activeFile}
              onFileChange={handleFileChange}
              onCodeChange={handleCodeChange}
              useSharedProvider={true}
            />
          </SandpackProvider>
        ) : (
          <BuilderContent
            activeView={activeView}
            onViewChange={setActiveView}
            isStreaming={isStreaming}
            isHydratingHistory={isHydratingHistory}
            onRequestPreviewSessionReset={handlePreviewSessionReset}
            currentFiles={hasAnyFiles ? currentFiles : {}}
            activeFile={activeFile}
            onFileChange={handleFileChange}
            onCodeChange={handleCodeChange}
            useSharedProvider={false}
          />
        )}
      </div>

      <VersionHistoryPanel
        versions={versions}
        appliedVersionId={appliedVersion?.id ?? null}
        currentFiles={activeChatId && messages.length > 0 ? currentFiles : {}}
        isLoading={versionsLoading}
        error={versionsError}
        defaultCollapsed={false}
        onRestore={handleRestoreVersion}
        onSaveVersion={handleSaveVersion}
        onDeleteVersion={handleDeleteVersion}
        onExportVersion={handleExportVersion}
      />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

export default BuilderLayout
