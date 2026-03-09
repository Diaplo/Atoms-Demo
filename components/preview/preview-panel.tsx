"use client"

import * as React from "react"
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewCore,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"
import {
  prepareSandpackRuntime,
  resolveBrowserSandpackBundlerUrl,
  SANDPACK_BUNDLER_URL,
} from "@/lib/sandpack/sandbox"
import { hasCodeFiles } from "@/lib/utils/code-files"

interface SandpackFile {
  code: string
  active?: boolean
  readOnly?: boolean
}

type SandpackFiles = Record<string, SandpackFile>

const RefreshIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
)

const DesktopIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

const MobileIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
)

const TabletIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

type ViewportSize = "desktop" | "tablet" | "mobile"

const viewportSizes: Record<ViewportSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
}

interface PreviewPanelProps {
  files: SandpackFiles
  className?: string
  showEditor?: boolean
  template?: "react-ts" | "react" | "vanilla" | "vanilla-ts"
  onStatusChange?: (status: "idle" | "loading" | "ready" | "error") => void
  useSharedProvider?: boolean
  autoRefreshToken?: number
}

function PreviewEmptyState({
  hasFiles,
}: {
  hasFiles: boolean
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-zinc-950 px-6 text-center">
      <div className="max-w-sm space-y-2">
        <h3 className="text-sm font-semibold text-zinc-100">
          {hasFiles ? "Waiting For Preview Entry" : "Preview Is Empty"}
        </h3>
        <p className="text-sm text-zinc-400">
          {hasFiles
            ? "The preview will render automatically after a runnable entry is available."
            : "The live result will appear here after code generation completes."}
        </p>
      </div>
    </div>
  )
}

function PreviewToolbar({
  viewport,
  onViewportChange,
  status,
  onRefresh,
}: {
  viewport: ViewportSize
  onViewportChange: (size: ViewportSize) => void
  status: "idle" | "loading" | "ready" | "error"
  onRefresh: () => void
}) {
  const { sandpack } = useSandpack()
  const isLoading = status === "loading"
  const runSandpack = sandpack.runSandpack

  const handleOpenInCodeSandbox = () => {
    const files = sandpack.files
    const sandboxParams = new URLSearchParams()

    sandboxParams.set("parameters", JSON.stringify({ files }))
    window.open(
      `https://codesandbox.io/api/v1/sandboxes/define?${sandboxParams.toString()}`,
      "_blank"
    )
  }

  const handleRefreshClick = React.useCallback(() => {
    onRefresh()

    window.setTimeout(() => {
      void runSandpack()
    }, 0)
  }, [onRefresh, runSandpack])

  return (
    <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-xs font-medium text-zinc-300">Preview</span>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <LoadingSpinner />
            <span>Building...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900/50 p-0.5">
        {(["desktop", "tablet", "mobile"] as ViewportSize[]).map((size) => (
          <button
            key={size}
            onClick={() => onViewportChange(size)}
            className={cn(
              "flex items-center justify-center rounded-md p-1.5 text-xs font-medium transition-all",
              viewport === size
                ? "bg-zinc-700/80 text-white shadow-sm"
                : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
            )}
            title={viewportSizes[size].label}
          >
            {size === "desktop" && <DesktopIcon />}
            {size === "tablet" && <TabletIcon />}
            {size === "mobile" && <MobileIcon />}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleRefreshClick}
          className="flex items-center gap-1.5 rounded-md bg-zinc-700/40 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-600/60 hover:text-white"
          title="Refresh Preview"
        >
          <RefreshIcon />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          onClick={handleOpenInCodeSandbox}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600/80 px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500"
          title="Open in CodeSandbox"
        >
          <ExternalLinkIcon />
          <span className="hidden sm:inline">CodeSandbox</span>
        </button>
      </div>
    </div>
  )
}

function PreviewContent({
  viewport,
  onStatusChange,
  autoRefreshToken,
}: {
  viewport: ViewportSize
  onStatusChange?: (status: "idle" | "loading" | "ready" | "error") => void
  autoRefreshToken: number
}) {
  const { sandpack, listen } = useSandpack()
  const sandpackStatus = sandpack.status
  const sandpackError = sandpack.error
  const sandpackFiles = sandpack.files
  const runSandpack = sandpack.runSandpack
  const hasTimedOut = sandpackStatus === "timeout"
  const hasError = sandpackError !== null || hasTimedOut
  const previewRootRef = React.useRef<HTMLDivElement | null>(null)
  const autoRetryRef = React.useRef(false)
  const lastAutoRefreshTokenRef = React.useRef<number | null>(null)
  const [isStuck, setIsStuck] = React.useState(false)
  const [isPreviewReady, setIsPreviewReady] = React.useState(false)
  const [iframeElement, setIframeElement] =
    React.useState<HTMLIFrameElement | null>(null)
  const isLoading =
    !hasError &&
    !isPreviewReady &&
    (sandpackStatus === "initial" || sandpackStatus === "running")

  const syncIframeElement = React.useCallback(() => {
    const nextIframe =
      (previewRootRef.current?.querySelector("iframe") as HTMLIFrameElement | null) ??
      null

    setIframeElement((current) => (current === nextIframe ? current : nextIframe))
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (sandpackStatus === "initial" || sandpackStatus === "idle") {
        void runSandpack()
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [runSandpack, sandpackFiles, sandpackStatus])

  React.useEffect(() => {
    autoRetryRef.current = false
  }, [sandpackFiles])

  React.useEffect(() => {
    if (
      autoRefreshToken <= 0 ||
      autoRefreshToken === lastAutoRefreshTokenRef.current
    ) {
      return
    }

    lastAutoRefreshTokenRef.current = autoRefreshToken
    autoRetryRef.current = false
    setIsPreviewReady(false)
    setIsStuck(false)

    const timer = window.setTimeout(() => {
      void runSandpack()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [autoRefreshToken, runSandpack])

  React.useEffect(() => {
    if (
      hasError ||
      isPreviewReady ||
      sandpackStatus !== "idle" ||
      autoRetryRef.current
    ) {
      return
    }

    autoRetryRef.current = true

    const timer = window.setTimeout(() => {
      void runSandpack()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [hasError, isPreviewReady, runSandpack, sandpackStatus])

  React.useEffect(() => {
    if (!onStatusChange) {
      return
    }

    if (hasError) {
      onStatusChange("error")
      return
    }

    if (isLoading) {
      onStatusChange("loading")
      return
    }

    onStatusChange(sandpackStatus === "idle" && !isPreviewReady ? "idle" : "ready")
  }, [hasError, isLoading, isPreviewReady, onStatusChange, sandpackStatus])

  React.useEffect(() => {
    syncIframeElement()

    const previewRoot = previewRootRef.current
    if (!previewRoot) {
      return
    }

    const observer = new MutationObserver(() => {
      syncIframeElement()
    })

    observer.observe(previewRoot, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [syncIframeElement])

  React.useEffect(() => {
    const unsubscribe = listen((message: any) => {
      if (
        message?.type === "connected" ||
        message?.type === "done" ||
        message?.type === "resize" ||
        message?.type === "urlchange"
      ) {
        setIsPreviewReady(true)
      }

      if (message?.type === "start") {
        setIsPreviewReady(false)
      }
    })

    return unsubscribe
  }, [listen])

  React.useEffect(() => {
    if (!iframeElement) {
      return
    }

    const handleLoad = () => {
      setIsPreviewReady(true)
    }

    iframeElement.addEventListener("load", handleLoad)
    return () => {
      iframeElement.removeEventListener("load", handleLoad)
    }
  }, [iframeElement])

  React.useEffect(() => {
    if (!isLoading || hasError) {
      setIsStuck(false)
      return
    }

    const timer = window.setTimeout(() => {
      setIsStuck(true)
    }, 10000)

    return () => window.clearTimeout(timer)
  }, [hasError, isLoading, sandpackStatus])

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="size-10 rounded-full border-2 border-zinc-700" />
              <div className="absolute inset-0 size-10 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
            </div>
            <span className="text-sm font-medium text-zinc-400">
              Initializing preview...
            </span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-x-0 top-0 z-50 border-b border-red-500/30 bg-red-950/95 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
              <svg
                className="size-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-semibold text-red-200">Build Error</h4>
              <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-red-950/50 p-2 text-xs text-red-300/90">
                {hasTimedOut
                  ? "Preview timed out before the bundler became ready. Click Refresh to retry."
                  : sandpackError?.message || "An unexpected error occurred"}
              </pre>
            </div>
          </div>
        </div>
      )}

      {isStuck && !hasError && (
        <div className="absolute inset-x-0 top-0 z-50 border-b border-amber-500/30 bg-amber-950/95 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-200">
              !
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-semibold text-amber-100">Bundler Still Starting</h4>
              <p className="mt-1 text-sm text-amber-200/90">
                The preview is still in `{sandpackStatus}` after 10 seconds.
              </p>
              <p className="mt-1 text-xs text-amber-200/70">
                The runtime is taking longer than expected to boot. Try `Refresh` to start a fresh preview session.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div
          ref={previewRootRef}
          className="flex h-full min-h-0 min-w-full shrink-0 flex-col"
          style={{
            width: viewportSizes[viewport].width,
            margin: viewport === "desktop" ? "0" : "0 auto",
            transition: "width 0.3s ease-in-out",
          }}
        >
          <SandpackPreviewCore
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{
              height: "100%",
              border: "none",
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function PreviewPanel({
  files,
  className,
  template = "react-ts",
  onStatusChange,
  useSharedProvider = false,
  autoRefreshToken = 0,
}: PreviewPanelProps) {
  const [viewport, setViewport] = React.useState<ViewportSize>("desktop")
  const [bundlerUrl, setBundlerUrl] = React.useState(SANDPACK_BUNDLER_URL)
  const [previewInstance, setPreviewInstance] = React.useState(0)
  const [previewStatus, setPreviewStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle")
  const lastAutoRefreshTokenRef = React.useRef(0)

  React.useEffect(() => {
    const resolvedBundlerUrl = resolveBrowserSandpackBundlerUrl()
    if (resolvedBundlerUrl !== bundlerUrl) {
      setBundlerUrl(resolvedBundlerUrl)
    }
  }, [bundlerUrl])

  const sandpackRuntime = React.useMemo(
    () => prepareSandpackRuntime(files),
    [files]
  )
  const hasAnyFiles = React.useMemo(() => hasCodeFiles(files), [files])
  const hasSandpackRuntime = React.useMemo(
    () => Boolean(sandpackRuntime.entry && Object.keys(sandpackRuntime.files).length > 0),
    [sandpackRuntime.entry, sandpackRuntime.files]
  )
  const handlePreviewStatusChange = React.useCallback(
    (status: "idle" | "loading" | "ready" | "error") => {
      setPreviewStatus(status)
      onStatusChange?.(status)
    },
    [onStatusChange]
  )
  const handleRefresh = React.useCallback(() => {
    setPreviewStatus("loading")
    setPreviewInstance((current) => current + 1)
  }, [])

  React.useEffect(() => {
    if (
      autoRefreshToken <= 0 ||
      autoRefreshToken === lastAutoRefreshTokenRef.current
    ) {
      return
    }

    lastAutoRefreshTokenRef.current = autoRefreshToken
    handleRefresh()
  }, [autoRefreshToken, handleRefresh])

  if (!hasSandpackRuntime) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/80 px-3 py-2 backdrop-blur-sm">
          <span className="text-xs font-medium text-zinc-300">Preview</span>
        </div>
        <PreviewEmptyState hasFiles={hasAnyFiles} />
      </div>
    )
  }

  if (useSharedProvider) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl",
          className
        )}
      >
        <PreviewToolbar
          viewport={viewport}
          onViewportChange={setViewport}
          status={previewStatus}
          onRefresh={handleRefresh}
        />

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950">
          <PreviewContent
            key={previewInstance}
            viewport={viewport}
            onStatusChange={handlePreviewStatusChange}
            autoRefreshToken={autoRefreshToken}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl",
        className
      )}
    >
      <SandpackProvider
        key={bundlerUrl}
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        template={template}
        theme="dark"
        files={sandpackRuntime.files}
        customSetup={sandpackRuntime.entry ? { entry: sandpackRuntime.entry } : undefined}
        options={{
          autorun: true,
          autoReload: true,
          bundlerURL: bundlerUrl,
          initMode: "immediate",
          recompileMode: "immediate",
          classes: {
            "sp-wrapper": "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            "sp-layout": "flex h-full min-h-0 min-w-0 flex-1 overflow-hidden",
          },
        }}
      >
        <PreviewToolbar
          viewport={viewport}
          onViewportChange={setViewport}
          status={previewStatus}
          onRefresh={handleRefresh}
        />

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950">
          <PreviewContent
            key={previewInstance}
            viewport={viewport}
            onStatusChange={handlePreviewStatusChange}
            autoRefreshToken={autoRefreshToken}
          />
        </div>
      </SandpackProvider>
    </div>
  )
}

export default PreviewPanel
