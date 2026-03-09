"use client"

import * as React from "react"
import {
  SandpackProvider,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"
import {
  prepareSandpackRuntime,
  resolveBrowserSandpackBundlerUrl,
  SANDPACK_BUNDLER_URL,
} from "@/lib/sandpack/sandbox"
import { hasCodeFiles, normalizeCodePath } from "@/lib/utils/code-files"
import type { CodeFiles } from "@/types"

interface CodeEditorProps {
  files: CodeFiles
  activeFile: string | null
  onFileChange?: (path: string) => void
  onCodeChange?: (path: string, code: string) => void
  className?: string
  readOnly?: boolean
  showLineNumbers?: boolean
  useSharedProvider?: boolean
}

function EditorEmptyState({
  hasFiles,
}: {
  hasFiles: boolean
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-zinc-950/50 px-6 text-center">
      <div className="max-w-sm space-y-2">
        <h3 className="text-sm font-semibold text-zinc-100">
          {hasFiles ? "Waiting For Runnable Code" : "Editor Is Empty"}
        </h3>
        <p className="text-sm text-zinc-400">
          {hasFiles
            ? "Sandpack will appear here after a runnable entry file is generated."
            : "Generated files will appear here after you send a prompt."}
        </p>
      </div>
    </div>
  )
}

function CodeEditorContent({
  activeFile,
  onCodeChange,
  onFileChange,
  readOnly,
}: {
  activeFile: string | null
  onCodeChange?: (path: string, code: string) => void
  onFileChange?: (path: string) => void
  readOnly?: boolean
}) {
  const { sandpack } = useSandpack()
  const pendingSandpackSelectionRef = React.useRef<string | null>(null)
  const sandpackActiveFile = sandpack.activeFile
  const sandpackFiles = sandpack.files
  const sandpackVisibleFiles = React.useMemo(
    () => sandpack.visibleFiles ?? [],
    [sandpack.visibleFiles]
  )
  const sandpackSetActiveFile = sandpack.setActiveFile
  const sandpackOpenFile = sandpack.openFile

  const normalizedActiveFile = React.useMemo(
    () => (activeFile ? normalizeCodePath(activeFile) : null),
    [activeFile]
  )
  const normalizedSandpackActiveFile = React.useMemo(
    () => (sandpackActiveFile ? normalizeCodePath(sandpackActiveFile) : null),
    [sandpackActiveFile]
  )
  const resolveSandpackPath = React.useCallback(
    (path: string) => {
      const normalizedPath = normalizeCodePath(path)

      if (sandpackFiles[normalizedPath]) {
        return normalizedPath
      }

      const withoutLeadingSlash = normalizedPath.slice(1)
      if (sandpackFiles[withoutLeadingSlash]) {
        return withoutLeadingSlash
      }

      if (sandpackFiles[path]) {
        return path
      }

      return null
    },
    [sandpackFiles]
  )

  React.useEffect(() => {
    if (!onFileChange || !sandpackActiveFile || !sandpackFiles[sandpackActiveFile]) {
      return
    }

    if (normalizedSandpackActiveFile !== normalizedActiveFile) {
      pendingSandpackSelectionRef.current = normalizedSandpackActiveFile
      onFileChange(normalizedSandpackActiveFile!)
      return
    }

    if (pendingSandpackSelectionRef.current === normalizedActiveFile) {
      pendingSandpackSelectionRef.current = null
    }
  }, [
    normalizedActiveFile,
    normalizedSandpackActiveFile,
    onFileChange,
    sandpackActiveFile,
    sandpackFiles,
  ])

  React.useEffect(() => {
    if (!normalizedActiveFile) {
      return
    }

    const targetSandpackPath = resolveSandpackPath(normalizedActiveFile)
    if (!targetSandpackPath) {
      return
    }

    const pendingSelection = pendingSandpackSelectionRef.current
    const waitingForStoreSync =
      Boolean(pendingSelection) &&
      pendingSelection !== normalizedActiveFile &&
      pendingSelection === normalizedSandpackActiveFile

    if (waitingForStoreSync) {
      return
    }

    if (normalizedSandpackActiveFile === normalizedActiveFile) {
      return
    }

    try {
      if (sandpackVisibleFiles.includes(targetSandpackPath)) {
        sandpackSetActiveFile(targetSandpackPath)
      } else {
        sandpackOpenFile(targetSandpackPath)
      }
    } catch (error) {
      console.error("[CodeEditor] Failed to sync active file from store:", {
        activeFile: normalizedActiveFile,
        currentSandpackFile: sandpackActiveFile,
        targetSandpackPath,
        visibleFiles: sandpackVisibleFiles,
        availableFiles: Object.keys(sandpackFiles),
        error,
      })
    }
  }, [
    normalizedActiveFile,
    normalizedSandpackActiveFile,
    sandpackFiles,
    sandpackOpenFile,
    sandpackSetActiveFile,
    sandpackVisibleFiles,
    resolveSandpackPath,
    sandpackActiveFile,
  ])

  const prevFilesRef = React.useRef(sandpackFiles)
  React.useEffect(() => {
    if (onCodeChange && sandpackFiles !== prevFilesRef.current) {
      const currentFile = sandpackFiles[sandpackActiveFile]
      const prevFile = prevFilesRef.current[sandpackActiveFile]
      if (currentFile?.code !== prevFile?.code) {
        onCodeChange(normalizeCodePath(sandpackActiveFile), currentFile?.code || "")
      }
      prevFilesRef.current = sandpackFiles
    }
  }, [sandpackActiveFile, sandpackFiles, onCodeChange])

  return (
    <div className="editor-scroll-shell flex min-h-0 min-w-0 flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor]:min-h-0 [&_.cm-editor]:min-w-0 [&_.cm-scroller]:h-full [&_.cm-scroller]:max-h-full [&_.cm-scroller]:overflow-auto [&_.sp-code-editor]:h-full [&_.sp-code-editor]:min-h-0 [&_.sp-code-editor]:min-w-0 [&_.sp-editor-viewer]:h-full [&_.sp-editor-viewer]:min-h-0 [&_.sp-editor-viewer]:min-w-0 [&_.sp-editor-viewer]:flex [&_.sp-editor-viewer]:flex-col [&_.sp-layout]:min-h-0 [&_.sp-stack]:min-h-0 [&_.sp-tabs]:shrink-0">
      <SandpackCodeEditor
        showLineNumbers={true}
        showInlineErrors={true}
        wrapContent={false}
        readOnly={readOnly}
        closableTabs={false}
        style={{
          height: "100%",
          minHeight: 0,
          minWidth: 0,
          flex: "1 1 auto",
          overflow: "hidden",
        }}
      />
    </div>
  )
}

export function CodeEditor({
  files,
  activeFile,
  onFileChange,
  onCodeChange,
  className,
  readOnly = false,
  useSharedProvider = false,
}: CodeEditorProps) {
  const [bundlerUrl, setBundlerUrl] = React.useState(SANDPACK_BUNDLER_URL)

  React.useEffect(() => {
    const resolvedBundlerUrl = resolveBrowserSandpackBundlerUrl()
    if (resolvedBundlerUrl !== bundlerUrl) {
      setBundlerUrl(resolvedBundlerUrl)
    }
  }, [bundlerUrl])

  const sandpackRuntime = React.useMemo(
    () => prepareSandpackRuntime(files, activeFile),
    [activeFile, files]
  )
  const sandpackFiles = sandpackRuntime.files
  const hasAnyFiles = React.useMemo(() => hasCodeFiles(files), [files])
  const hasSandpackRuntime = React.useMemo(
    () => Boolean(sandpackRuntime.entry && Object.keys(sandpackFiles).length > 0),
    [sandpackFiles, sandpackRuntime.entry]
  )

  if (!hasSandpackRuntime) {
    return (
      <div className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden", className)}>
        <EditorEmptyState hasFiles={hasAnyFiles} />
      </div>
    )
  }

  if (useSharedProvider) {
    return (
      <div className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden", className)}>
        <CodeEditorContent
          activeFile={activeFile}
          onCodeChange={onCodeChange}
          onFileChange={onFileChange}
          readOnly={readOnly}
        />
      </div>
    )
  }

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden", className)}>
      <SandpackProvider
        key={bundlerUrl}
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        customSetup={sandpackRuntime.entry ? { entry: sandpackRuntime.entry } : undefined}
        options={{
          activeFile: sandpackRuntime.activeFile ?? undefined,
          bundlerURL: bundlerUrl,
          classes: {
            "sp-wrapper": "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            "sp-layout": "flex h-full min-h-0 min-w-0 flex-1 overflow-hidden",
          },
        }}
      >
        <CodeEditorContent
          activeFile={activeFile}
          onCodeChange={onCodeChange}
          onFileChange={onFileChange}
          readOnly={readOnly}
        />
      </SandpackProvider>
    </div>
  )
}

export default CodeEditor
