/**
 * Builder Store - Unified state management for AI Builder
 * Following AGENTS.md specifications for state management
 * 
 * Manages:
 * - currentCode: Current code in the editor/preview
 * - messages: Chat messages with AI
 * - versions: Code version history
 * - currentVersion: Currently selected version
 */

import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import type { CodeFiles, ChatMessage, CodeVersion, ViewTab } from "@/types"
import {
  getPrimaryFilePath,
  mergeCodeFiles,
  normalizeCodePath,
} from "@/lib/utils/code-files"

function areMessagesEqual(a: ChatMessage[], b: ChatMessage[]) {
  if (a === b) return true
  if (a.length !== b.length) return false

  for (let index = 0; index < a.length; index += 1) {
    if (
      a[index]?.id !== b[index]?.id ||
      a[index]?.role !== b[index]?.role ||
      a[index]?.content !== b[index]?.content
    ) {
      return false
    }
  }

  return true
}

function resolveActiveFile(files: CodeFiles, currentActiveFile?: string | null) {
  if (currentActiveFile && files[currentActiveFile]) {
    return currentActiveFile
  }

  if (currentActiveFile) {
    const normalizedActiveFile = normalizeCodePath(currentActiveFile)
    if (files[normalizedActiveFile]) {
      return normalizedActiveFile
    }
  }

  return getPrimaryFilePath(files)
}

function normalizeStoreFiles(files: CodeFiles): CodeFiles {
  const normalized: CodeFiles = {}

  Object.entries(files).forEach(([rawPath, file]) => {
    const normalizedPath = normalizeCodePath(rawPath)
    const existingFile = normalized[normalizedPath]
    const shouldReplaceExisting = rawPath.startsWith("/") || !existingFile

    normalized[normalizedPath] = shouldReplaceExisting
      ? {
          ...file,
          active: Boolean(file.active || existingFile?.active),
        }
      : {
          ...existingFile,
          active: Boolean(existingFile.active || file.active),
        }
  })

  return normalized
}

// ============================================
// Store State Interface
// ============================================

interface BuilderState {
  // Code state
  currentFiles: CodeFiles
  activeFile: string | null
  
  // Chat state
  messages: ChatMessage[]
  
  // Version state
  versions: CodeVersion[]
  currentVersionId: string | null
  
  // UI state
  activeView: ViewTab
  isLoading: boolean
  isStreaming: boolean
  error: string | null
}

interface BuilderActions {
  // Code actions
  setCurrentFiles: (files: CodeFiles) => void
  updateFile: (path: string, code: string) => void
  setActiveFile: (path: string | null) => void
  clearFiles: () => void
  
  // Chat actions
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, content: string) => void
  clearMessages: () => void
  
  // Version actions
  setVersions: (versions: CodeVersion[]) => void
  addVersion: (version: CodeVersion) => void
  selectVersion: (id: string | null) => void
  deleteVersion: (id: string) => void
  restoreVersion: (version: CodeVersion) => void
  clearVersions: () => void
  
  // UI actions
  setActiveView: (view: ViewTab) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  
  // Composite actions
  applyGeneratedCode: (files: CodeFiles) => void
  reset: () => void
}

// ============================================
// Initial State
// ============================================

const defaultFiles: CodeFiles = {}

const initialState: BuilderState = {
  currentFiles: defaultFiles,
  activeFile: null,
  messages: [],
  versions: [],
  currentVersionId: null,
  activeView: "split",
  isLoading: false,
  isStreaming: false,
  error: null,
}

// ============================================
// Store Implementation
// ============================================

export const useBuilderStore = create<BuilderState & BuilderActions>(set => ({
  ...initialState,

  // ----------------------------------------
  // Code Actions
  // ----------------------------------------

  setCurrentFiles: (files) => {
    const normalizedFiles = normalizeStoreFiles(files)
    set((state) => ({
      currentFiles: normalizedFiles,
      activeFile: resolveActiveFile(normalizedFiles, state.activeFile),
      error: null,
    }))
  },

  updateFile: (path, code) => {
    set((state) => {
      const normalizedPath = normalizeCodePath(path)
      const resolvedPath = state.currentFiles[normalizedPath]
        ? normalizedPath
        : state.currentFiles[path]
          ? path
          : normalizedPath
      const existingFile = state.currentFiles[resolvedPath]
      if (existingFile?.code === code) {
        return state
      }

      return {
        currentFiles: {
          ...state.currentFiles,
          [resolvedPath]: {
            ...existingFile,
            code,
          },
        },
      }
    })
  },

  setActiveFile: (path) => {
    set((state) => {
      const normalizedPath = path ? normalizeCodePath(path) : null
      const resolvedPath =
        normalizedPath && state.currentFiles[normalizedPath]
          ? normalizedPath
          : path && state.currentFiles[path]
            ? path
            : null
      const nextActiveFile =
        resolvedPath
          ? resolvedPath
          : resolveActiveFile(state.currentFiles, state.activeFile)

      if (nextActiveFile === state.activeFile) {
        return state
      }

      return { activeFile: nextActiveFile }
    })
  },

  clearFiles: () => {
    set({ currentFiles: defaultFiles, activeFile: null })
  },

  // ----------------------------------------
  // Chat Actions
  // ----------------------------------------

  setMessages: (messages) => {
    set((state) => (areMessagesEqual(state.messages, messages) ? state : { messages }))
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }))
  },

  updateMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    }))
  },

  clearMessages: () => {
    set({ messages: [] })
  },

  // ----------------------------------------
  // Version Actions
  // ----------------------------------------

  setVersions: (versions) => {
    set({ versions, error: null })
  },

  addVersion: (version) => {
    set((state) => ({
      versions: [version, ...state.versions],
    }))
  },

  selectVersion: (id) => {
    set({ currentVersionId: id })
  },

  deleteVersion: (id) => {
    set((state) => ({
      versions: state.versions.filter((v) => v.id !== id),
      currentVersionId:
        state.currentVersionId === id ? null : state.currentVersionId,
    }))
  },

  restoreVersion: (version) => {
    const normalizedFiles = normalizeStoreFiles(version.files)
    set({
      currentFiles: normalizedFiles,
      activeFile: resolveActiveFile(normalizedFiles),
      currentVersionId: version.id,
      error: null,
    })
  },

  clearVersions: () => {
    set({ versions: [], currentVersionId: null })
  },

  // ----------------------------------------
  // UI Actions
  // ----------------------------------------

  setActiveView: (view) => {
    set({ activeView: view })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  setStreaming: (streaming) => {
    set({ isStreaming: streaming })
  },

  setError: (error) => {
    set({ error })
  },

  // ----------------------------------------
  // Composite Actions
  // ----------------------------------------

  applyGeneratedCode: files => {
    set((state) => {
      const normalizedFiles = normalizeStoreFiles(
        mergeCodeFiles(state.currentFiles, files, state.activeFile)
      )

      return {
        currentFiles: normalizedFiles,
        activeFile: resolveActiveFile(normalizedFiles, state.activeFile),
        currentVersionId: null,
        error: null,
      }
    })
  },

  reset: () => {
    set(initialState)
  },
}))

// ============================================
// Selector Hooks (for performance)
// ============================================

export const useCurrentFiles = () => useBuilderStore((state) => state.currentFiles)
export const useActiveFile = () => useBuilderStore((state) => state.activeFile)
export const useMessages = () => useBuilderStore((state) => state.messages)
export const useVersions = () => useBuilderStore((state) => state.versions)
export const useCurrentVersion = () =>
  useBuilderStore((state) => {
    const { versions, currentVersionId } = state
    return currentVersionId
      ? versions.find((v) => v.id === currentVersionId) ?? null
      : null
  })
export const useActiveView = () => useBuilderStore((state) => state.activeView)
export const useIsLoading = () => useBuilderStore((state) => state.isLoading)
export const useIsStreaming = () => useBuilderStore((state) => state.isStreaming)
export const useBuilderError = () => useBuilderStore((state) => state.error)

// ============================================
// Action Hooks (for convenience)
// ============================================

export const useBuilderActions = () =>
  useBuilderStore(
    useShallow((state) => ({
      setCurrentFiles: state.setCurrentFiles,
      updateFile: state.updateFile,
      setActiveFile: state.setActiveFile,
      clearFiles: state.clearFiles,
      setMessages: state.setMessages,
      addMessage: state.addMessage,
      updateMessage: state.updateMessage,
      clearMessages: state.clearMessages,
      setVersions: state.setVersions,
      addVersion: state.addVersion,
      selectVersion: state.selectVersion,
      deleteVersion: state.deleteVersion,
      restoreVersion: state.restoreVersion,
      clearVersions: state.clearVersions,
      setActiveView: state.setActiveView,
      setLoading: state.setLoading,
      setStreaming: state.setStreaming,
      setError: state.setError,
      applyGeneratedCode: state.applyGeneratedCode,
      reset: state.reset,
    }))
  )
