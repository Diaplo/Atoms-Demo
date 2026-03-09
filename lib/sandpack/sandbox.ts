/**
 * Sandpack Configuration and Utilities
 * Following AGENTS.md specifications for Sandpack runtime
 * 
 * Default runtime environment:
 * - React + Tailwind
 * - App.tsx, index.tsx, styles.css
 */

import type { CodeFiles } from "@/types"

// ============================================
// Sandpack Template Types
// ============================================

export interface SandpackDependency {
  [name: string]: string
}

export interface SandpackEnvironment {
  files: CodeFiles
  dependencies: SandpackDependency
  entry: string
}

export interface PreparedSandpackFile {
  code: string
  active?: boolean
  readOnly?: boolean
}

export interface PreparedSandpackRuntime {
  files: Record<string, PreparedSandpackFile>
  entry: string | null
  activeFile: string | null
}

export interface CodeArchiveOptions {
  filename?: string
  packageName?: string
  title?: string
}

// ============================================
// Default Dependencies
// ============================================

export const DEFAULT_DEPENDENCIES: SandpackDependency = {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  tailwindcss: "^3.4.0",
}

const LOCAL_BUNDLER_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost"])

function normalizeBundlerUrl(url: string): string {
  const trimmedUrl = url.trim().replace(/\/+$/, "")

  try {
    const normalizedUrl = new URL(trimmedUrl)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

    if (!appUrl) {
      return normalizedUrl.toString().replace(/\/+$/, "")
    }

    const appHostname = new URL(appUrl).hostname
    if (
      appHostname &&
      LOCAL_BUNDLER_HOSTS.has(normalizedUrl.hostname) &&
      normalizedUrl.hostname !== appHostname
    ) {
      normalizedUrl.hostname = appHostname
    }

    return normalizedUrl.toString().replace(/\/+$/, "")
  } catch {
    return trimmedUrl
  }
}

export function resolveBrowserSandpackBundlerUrl(baseUrl: string = SANDPACK_BUNDLER_URL): string {
  if (typeof window === "undefined") {
    return baseUrl
  }

  try {
    const resolvedUrl = new URL(baseUrl)
    const browserUrl = new URL(window.location.href)

    if (
      browserUrl.hostname &&
      LOCAL_BUNDLER_HOSTS.has(resolvedUrl.hostname) &&
      resolvedUrl.hostname !== browserUrl.hostname
    ) {
      resolvedUrl.hostname = browserUrl.hostname
    }

    return resolvedUrl.toString().replace(/\/+$/, "")
  } catch {
    return baseUrl
  }
}

export const DEFAULT_SANDPACK_BUNDLER_HOST =
  process.env.SANDPACK_BUNDLER_HOST?.trim() || "0.0.0.0"

export const DEFAULT_SANDPACK_BUNDLER_PUBLIC_HOST =
  process.env.SANDPACK_BUNDLER_PUBLIC_HOST?.trim() ||
  (() => {
    try {
      return process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
        : "localhost"
    } catch {
      return "localhost"
    }
  })()

export const DEFAULT_SANDPACK_BUNDLER_PORT =
  process.env.SANDPACK_BUNDLER_PORT?.trim() || "3101"

export const DEFAULT_SANDPACK_BUNDLER_URL =
  normalizeBundlerUrl(
    `http://${DEFAULT_SANDPACK_BUNDLER_PUBLIC_HOST}:${DEFAULT_SANDPACK_BUNDLER_PORT}`
  )

export const SANDPACK_BUNDLER_URL =
  normalizeBundlerUrl(
    process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL?.trim() ||
      DEFAULT_SANDPACK_BUNDLER_URL
  )

// ============================================
// Default Files
// ============================================

export const DEFAULT_APP_CODE = `export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="text-center">
        <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 shadow-2xl shadow-indigo-500/30">
          <svg className="size-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">AI Builder</h1>
        <p className="mt-2 text-zinc-400">Start a conversation to generate code</p>
      </div>
    </div>
  );
}`

export const DEFAULT_INDEX_CODE = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`

export const DEFAULT_STYLES_CODE = `/* Tailwind CSS is available via CDN in the preview */
/* Add any custom styles here */

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}`

// ============================================
// Default Environment
// ============================================

export function getDefaultEnvironment(): SandpackEnvironment {
  return {
    files: {
      "/App.tsx": {
        code: DEFAULT_APP_CODE,
        active: true,
      },
      "/index.tsx": {
        code: DEFAULT_INDEX_CODE,
      },
      "/styles.css": {
        code: DEFAULT_STYLES_CODE,
      },
    },
    dependencies: DEFAULT_DEPENDENCIES,
    entry: "/index.tsx",
  }
}

const ENTRY_CANDIDATES = [
  "/index.tsx",
  "/index.jsx",
  "/index.ts",
  "/index.js",
  "/main.tsx",
  "/main.jsx",
  "/main.ts",
  "/main.js",
  "/src/index.tsx",
  "/src/index.jsx",
  "/src/index.ts",
  "/src/index.js",
  "/src/main.tsx",
  "/src/main.jsx",
  "/src/main.ts",
  "/src/main.js",
]

const APP_FILE_PATTERN = /\/App\.(tsx|jsx|ts|js)$/
const COMPONENT_FILE_PATTERN = /\.(tsx|jsx|ts|js)$/
const STYLE_FILE_PATTERN = /\.(css|scss|sass|less)$/

export function getSandpackEntryPath(files: CodeFiles): string | null {
  for (const path of ENTRY_CANDIDATES) {
    if (files[path]) {
      return path
    }
  }

  return null
}

function isAppComponentPath(path: string): boolean {
  return APP_FILE_PATTERN.test(path)
}

function isRuntimeEntryPath(path: string): boolean {
  return ENTRY_CANDIDATES.includes(path)
}

function isComponentPath(path: string): boolean {
  return COMPONENT_FILE_PATTERN.test(path)
}

function isStylePath(path: string): boolean {
  return STYLE_FILE_PATTERN.test(path)
}

function getPathDirectory(path: string): string {
  const lastSlash = path.lastIndexOf("/")
  if (lastSlash <= 0) {
    return "/"
  }

  return path.slice(0, lastSlash)
}

function removeExtension(path: string): string {
  const lastDot = path.lastIndexOf(".")
  if (lastDot === -1) {
    return path
  }

  return path.slice(0, lastDot)
}

function normalizeRuntimePath(path: string): string {
  const trimmedPath = path.trim()
  const withoutLeadingSlashes = trimmedPath.replace(/^\/+/, "")

  return `/${withoutLeadingSlashes}`
}

function toImportPath(
  fromFilePath: string,
  toFilePath: string,
  options?: { preserveExtension?: boolean }
): string {
  const fromDirectory = getPathDirectory(fromFilePath)
  const fromParts = fromDirectory.split("/").filter(Boolean)
  const normalizedTargetPath = options?.preserveExtension
    ? toFilePath
    : removeExtension(toFilePath)
  const toParts = normalizedTargetPath.split("/").filter(Boolean)

  let sharedIndex = 0
  while (
    sharedIndex < fromParts.length &&
    sharedIndex < toParts.length &&
    fromParts[sharedIndex] === toParts[sharedIndex]
  ) {
    sharedIndex += 1
  }

  const upSegments = fromParts.slice(sharedIndex).map(() => "..")
  const downSegments = toParts.slice(sharedIndex)
  const joinedPath = [...upSegments, ...downSegments].join("/")

  if (!joinedPath) {
    return "."
  }

  return joinedPath.startsWith(".") ? joinedPath : `./${joinedPath}`
}

function findAppComponentPath(files: CodeFiles): string | null {
  return (
    Object.keys(files).find(isAppComponentPath) ??
    Object.keys(files).find(
      (path) => isComponentPath(path) && !isRuntimeEntryPath(path)
    ) ??
    null
  )
}

function findStyleFilePath(files: CodeFiles, preferredDirectory?: string): string | null {
  const filePaths = Object.keys(files)

  if (preferredDirectory) {
    const preferredStyle = filePaths.find(
      (path) => getPathDirectory(path) === preferredDirectory && isStylePath(path)
    )

    if (preferredStyle) {
      return preferredStyle
    }
  }

  return filePaths.find(isStylePath) ?? null
}

function createRuntimeEntryCode(entryPath: string, appPath: string, stylePath?: string | null) {
  const appImportPath = toImportPath(entryPath, appPath)
  const styleImport = stylePath
    ? `import "${toImportPath(entryPath, stylePath, { preserveExtension: true })}";\n`
    : ""

  return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "${appImportPath}";
${styleImport}
const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
}

export function prepareSandpackRuntime(
  files: CodeFiles,
  preferredActiveFile?: string | null
): PreparedSandpackRuntime {
  const normalizedFiles: CodeFiles = {}
  Object.entries(files).forEach(([rawPath, file]) => {
    const normalizedPath = normalizeRuntimePath(rawPath)
    normalizedFiles[normalizedPath] = {
      ...normalizedFiles[normalizedPath],
      ...file,
      active: Boolean(file.active || normalizedFiles[normalizedPath]?.active),
    }
  })

  if (Object.keys(normalizedFiles).length === 0) {
    return {
      files: {},
      entry: null,
      activeFile: null,
    }
  }

  const preparedFiles: Record<string, PreparedSandpackFile> = {}

  Object.entries(normalizedFiles).forEach(([path, file]) => {
    preparedFiles[path] = {
      code: typeof file === "string" ? file : file.code,
      readOnly: typeof file === "string" ? undefined : file.readOnly,
    }
  })

  let entryPath = getSandpackEntryPath(normalizedFiles)
  let appPath = findAppComponentPath(normalizedFiles)

  if (!entryPath && appPath) {
    let stylePath = findStyleFilePath(normalizedFiles, getPathDirectory(appPath))

    if (!stylePath) {
      stylePath = "/styles.css"

      if (!preparedFiles[stylePath]) {
        preparedFiles[stylePath] = {
          code: DEFAULT_STYLES_CODE,
          readOnly: true,
        }
      }
    }

    entryPath = getPathDirectory(appPath) === "/" ? "/index.tsx" : `${getPathDirectory(appPath)}/index.tsx`

    if (!preparedFiles[entryPath]) {
      preparedFiles[entryPath] = {
        code: createRuntimeEntryCode(entryPath, appPath, stylePath),
        readOnly: true,
      }
    }
  }

  const hasRunnableRuntime = Boolean(entryPath || appPath)

  const activeFile =
    (preferredActiveFile && preparedFiles[normalizeRuntimePath(preferredActiveFile)]
      ? normalizeRuntimePath(preferredActiveFile)
      : null) ??
    appPath ??
    entryPath ??
    Object.keys(preparedFiles)[0] ??
    null

  if (activeFile) {
    Object.keys(preparedFiles).forEach((path) => {
      preparedFiles[path] = {
        ...preparedFiles[path],
        active: path === activeFile,
      }
    })
  }

  return {
    files: preparedFiles,
    entry: hasRunnableRuntime ? entryPath : null,
    activeFile,
  }
}

// ============================================
// File Utilities
// ============================================

/**
 * Ensure all required files exist in the environment
 */
export function ensureRequiredFiles(files: CodeFiles): CodeFiles {
  const result: CodeFiles = {}
  Object.entries(files).forEach(([path, file]) => {
    result[normalizeRuntimePath(path)] = file
  })
  const entryPath = getSandpackEntryPath(result)
  
  // Ensure App.tsx exists
  if (!entryPath && !result["/App.tsx"]) {
    result["/App.tsx"] = {
      code: DEFAULT_APP_CODE,
      active: true,
    }
  }
  
  // Ensure index.tsx exists
  if (!entryPath && !result["/index.tsx"]) {
    result["/index.tsx"] = {
      code: DEFAULT_INDEX_CODE,
    }
  }
  
  // Ensure styles.css exists
  if (!entryPath && !result["/styles.css"]) {
    result["/styles.css"] = {
      code: DEFAULT_STYLES_CODE,
    }
  }
  
  return result
}

/**
 * Merge generated code with environment
 */
export function mergeWithEnvironment(
  generatedFiles: CodeFiles,
  existingFiles: CodeFiles = {}
): CodeFiles {
  const result: CodeFiles = {}
  Object.entries(existingFiles).forEach(([path, file]) => {
    result[normalizeRuntimePath(path)] = file
  })
  
  // Add generated files
  for (const [path, file] of Object.entries(generatedFiles)) {
    result[normalizeRuntimePath(path)] = file
  }
  
  // Ensure required files
  return ensureRequiredFiles(result)
}

/**
 * Create a Sandpack-ready file structure
 */
export function createSandpackFiles(
  appCode: string,
  additionalFiles: CodeFiles = {}
): CodeFiles {
  return {
    "/App.tsx": {
      code: appCode,
      active: true,
    },
    "/index.tsx": {
      code: DEFAULT_INDEX_CODE,
    },
    "/styles.css": {
      code: DEFAULT_STYLES_CODE,
    },
    ...additionalFiles,
  }
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate file path
 */
export function isValidFilePath(path: string): boolean {
  // Must start with /
  if (!path.startsWith("/")) return false
  
  // Must have extension
  const lastDot = path.lastIndexOf(".")
  if (lastDot === -1 || lastDot === path.length - 1) return false
  
  return true
}

/**
 * Get file extension
 */
export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf(".")
  return lastDot !== -1 ? path.slice(lastDot + 1) : ""
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    json: "json",
    md: "markdown",
  }
  return map[ext.toLowerCase()] || "text"
}

// ============================================
// Export Utilities
// ============================================

/**
 * Generate a shareable sandbox URL
 */
export function generateSandboxUrl(files: CodeFiles): string {
  const params = new URLSearchParams()

  // Encode files
  const encodedFiles: Record<string, { content: string }> = {}
  for (const [path, file] of Object.entries(files)) {
    encodedFiles[path] = { content: typeof file === "string" ? file : file.code }
  }
  
  params.set("parameters", JSON.stringify({
    files: encodedFiles,
  }))
  
  return `https://codesandbox.io/api/v1/sandboxes/define?${params.toString()}`
}

/**
 * Download code as a ZIP file (client-side)
 */
function sanitizeArchivePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/")
}

function sanitizePackageName(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalizedName || "ai-builder-export"
}

function sanitizeDownloadFilename(name: string): string {
  const normalizedName = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalizedName || "ai-builder-code"
}

function createExportPackageJson(packageName: string) {
  return `${JSON.stringify(
    {
      name: packageName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.3.0",
        "react-dom": "^18.3.0",
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        typescript: "^5.3.0",
        vite: "^5.4.0",
      },
    },
    null,
    2
  )}\n`
}

function createExportTsconfig() {
  return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
}
`
}

function createExportHtml(title: string, entryPath: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entryPath}"></script>
  </body>
</html>
`
}

function createExportReadme(title: string) {
  return `# ${title}

This project was exported from AI Builder Version History.

## Run locally

1. npm install
2. npm run dev

Tailwind CSS is loaded through the CDN in index.html to match the builder preview runtime.
`
}

function buildCrc32Table() {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
}

const CRC32_TABLE = buildCrc32Table()

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    value = CRC32_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8)
  }

  return (value ^ 0xffffffff) >>> 0
}

function createZipBlob(entries: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder()
  const fileParts: Uint8Array[] = []
  const centralDirectoryParts: Uint8Array[] = []
  let offset = 0

  entries.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name)
    const contentBytes = encoder.encode(content)
    const checksum = crc32(contentBytes)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, 0, true)
    localView.setUint16(12, 0, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, contentBytes.length, true)
    localView.setUint32(22, contentBytes.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, contentBytes.length, true)
    centralView.setUint32(24, contentBytes.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)

    fileParts.push(localHeader, contentBytes)
    centralDirectoryParts.push(centralHeader)
    offset += localHeader.length + contentBytes.length
  })

  const centralDirectorySize = centralDirectoryParts.reduce(
    (size, part) => size + part.length,
    0
  )

  const endOfCentralDirectory = new Uint8Array(22)
  const endView = new DataView(endOfCentralDirectory.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralDirectorySize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  const blobParts = [...fileParts, ...centralDirectoryParts, endOfCentralDirectory].map(
    (part) =>
      part.buffer.slice(
        part.byteOffset,
        part.byteOffset + part.byteLength
      ) as ArrayBuffer
  )

  return new Blob(
    blobParts,
    { type: "application/zip" }
  )
}

export function createExportProjectFiles(
  files: CodeFiles,
  options: CodeArchiveOptions = {}
): Record<string, string> {
  const runtimeFiles = ensureRequiredFiles(files)
  const entryPath = sanitizeArchivePath(
    getSandpackEntryPath(runtimeFiles) ?? "/index.tsx"
  )
  const title = options.title?.trim() || "AI Builder Export"
  const packageName = sanitizePackageName(
    options.packageName ?? options.filename ?? title
  )
  const exportFiles: Record<string, string> = {}

  Object.entries(runtimeFiles)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .forEach(([path, file]) => {
      if (file.deleted) {
        return
      }

      const archivePath = sanitizeArchivePath(path)
      if (!archivePath) {
        return
      }

      exportFiles[archivePath] = file.code
    })

  if (!exportFiles["package.json"]) {
    exportFiles["package.json"] = createExportPackageJson(packageName)
  }

  if (!exportFiles["tsconfig.json"]) {
    exportFiles["tsconfig.json"] = createExportTsconfig()
  }

  if (!exportFiles["index.html"]) {
    exportFiles["index.html"] = createExportHtml(title, entryPath)
  }

  if (!exportFiles["README.md"]) {
    exportFiles["README.md"] = createExportReadme(title)
  }

  if (!exportFiles[".gitignore"]) {
    exportFiles[".gitignore"] = "node_modules\ndist\n"
  }

  return exportFiles
}

export function downloadCodeArchive(
  files: CodeFiles,
  options: CodeArchiveOptions = {}
): void {
  const archiveFiles = createExportProjectFiles(files, options)
  const blob = createZipBlob(
    Object.entries(archiveFiles).map(([name, content]) => ({ name, content }))
  )
  const filename = sanitizeDownloadFilename(
    options.filename ?? options.title ?? "ai-builder-code"
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadCode(
  files: CodeFiles,
  filename: string = "ai-builder-code"
): void {
  downloadCodeArchive(files, {
    filename,
    title: filename,
  })
}
