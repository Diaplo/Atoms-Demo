import type { CodeFile, CodeFiles } from '@/types'
import { getSandpackEntryPath } from '@/lib/sandpack/sandbox'

export type StoredCodeFile = CodeFile | string
export type StoredCodeFiles = Record<string, StoredCodeFile>

export function normalizeCodePath(path: string): string {
  const trimmedPath = path.trim()
  const withoutLeadingSlashes = trimmedPath.replace(/^\/+/, '')

  return `/${withoutLeadingSlashes}`
}

export function normalizeCodeFiles(files?: StoredCodeFiles | null): CodeFiles {
  if (!files) {
    return {}
  }

  const normalized: CodeFiles = {}

  Object.entries(files).forEach(([path, file]) => {
    const normalizedPath = normalizeCodePath(path)

    if (typeof file === 'string') {
      normalized[normalizedPath] = {
        code: file,
        active: normalizedPath === '/App.tsx',
      }
      return
    }

    normalized[normalizedPath] = {
      code: file.code ?? '',
      active: file.active ?? normalizedPath === '/App.tsx',
      readOnly: file.readOnly,
      deleted: file.deleted,
    }
  })

  return normalized
}

export function mergeCodeFiles(
  existingFiles?: StoredCodeFiles | null,
  incomingFiles?: StoredCodeFiles | null,
  preferredActiveFile?: string | null
): CodeFiles {
  const normalizedExistingFiles = normalizeCodeFiles(existingFiles)
  const normalizedIncomingFiles = normalizeCodeFiles(incomingFiles)
  const mergedFiles: CodeFiles = {
    ...normalizedExistingFiles,
  }

  Object.entries(normalizedIncomingFiles).forEach(([path, file]) => {
    if (file.deleted) {
      delete mergedFiles[path]
      return
    }

    const existingFile = mergedFiles[path]

    mergedFiles[path] = existingFile
      ? {
          ...existingFile,
          ...file,
        }
      : file
  })

  const normalizedPreferredActiveFile = preferredActiveFile
    ? normalizeCodePath(preferredActiveFile)
    : null
  const incomingPrimaryFile = getPrimaryFilePath(normalizedIncomingFiles)
  const activeFile =
    (normalizedPreferredActiveFile && mergedFiles[normalizedPreferredActiveFile]
      ? normalizedPreferredActiveFile
      : null) ??
    (incomingPrimaryFile && mergedFiles[incomingPrimaryFile]
      ? incomingPrimaryFile
      : null) ??
    getPrimaryFilePath(mergedFiles)

  if (!activeFile) {
    return mergedFiles
  }

  const filesWithResolvedActiveState: CodeFiles = {}

  Object.entries(mergedFiles).forEach(([path, file]) => {
    filesWithResolvedActiveState[path] = {
      ...file,
      active: path === activeFile,
    }
  })

  return filesWithResolvedActiveState
}

export function hasCodeFiles(files?: StoredCodeFiles | null): boolean {
  return Boolean(files && Object.keys(files).length > 0)
}

export function getPrimaryFilePath(files: CodeFiles): string | null {
  const visibleFiles = Object.entries(files).filter(([, file]) => !file.deleted)
  const activeFile = visibleFiles.find(([, file]) => file.active)
  if (activeFile) {
    return activeFile[0]
  }

  const visibleFileMap = Object.fromEntries(visibleFiles)
  const sandpackEntry = getSandpackEntryPath(visibleFileMap)
  if (sandpackEntry) {
    return sandpackEntry
  }

  if (visibleFileMap['/App.tsx']) {
    return '/App.tsx'
  }

  const firstFile = Object.keys(visibleFileMap)[0]
  return firstFile ?? null
}
