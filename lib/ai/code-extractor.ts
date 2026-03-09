/**
 * Code Extractor - Extract React code from AI responses
 * Following AGENTS.md section 7: AI Output Format Rules
 * 
 * Uses code-parser.ts for multi-file code block extraction
 */

import {
  parseCodeBlocks,
  parseCodeBlocksIncremental,
  type CodeBlocksMap,
} from '@/lib/utils/code-parser'
import type { CodeFiles } from '@/types'

const DELETE_FILE_SENTINEL = "__DELETE_FILE__"

/**
 * Extract the first React component code block from markdown text
 * Supports ```tsx, ```jsx, ```typescript, ```javascript code blocks
 */
export function extractReactCode(text: string): string | null {
  // Match code blocks with tsx, jsx, typescript, or javascript
  const codeBlockRegex = /```(?:tsx|jsx|typescript|javascript)\s*\n([\s\S]*?)```/g
  
  const matches: RegExpExecArray[] = []
  let match
  while ((match = codeBlockRegex.exec(text)) !== null) {
    matches.push(match)
  }
  
  if (matches.length === 0) {
    return null
  }
  
  // Return the first code block (trimmed)
  return matches[0][1].trim()
}

/**
 * Check if text contains a code block
 */
export function hasCodeBlock(text: string): boolean {
  const codeBlockRegex = /```(?:tsx|jsx|typescript|javascript)\s*\n[\s\S]*?```/
  return codeBlockRegex.test(text)
}

/**
 * Extract all code blocks from markdown text
 */
export function extractAllCodeBlocks(text: string): Array<{
  language: string
  code: string
}> {
  const codeBlockRegex = /```(\w+)\s*\n([\s\S]*?)```/g
  
  const blocks: Array<{ language: string; code: string }> = []
  let match
  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1],
      code: match[2].trim()
    })
  }
  
  return blocks
}

/**
 * Extract multi-file code blocks from AI response
 * Uses the advanced code-parser.ts for filepath-based extraction
 * 
 * @param text - Markdown text from AI response
 * @returns CodeFiles object with file paths as keys
 * 
 * @example
 * const files = extractMultiFileCode(`
 * \`\`\`tsx
 * // filepath: App.tsx
 * export default function App() { return <div>Hello</div> }
 * \`\`\`
 * 
 * \`\`\`css
 * /* filepath: styles.css *\/
 * .container { padding: 20px; }
 * \`\`\`
 * `)
 * // Returns: { "App.tsx": { code: "..." }, "styles.css": { code: "..." } }
 */
function normalizePath(filepath: string): string {
  return filepath.startsWith('/') ? filepath : `/${filepath}`
}

function isAppEntrypoint(path: string): boolean {
  return /\/App\.(tsx|jsx|ts|js)$/.test(path)
}

function isRuntimeEntrypoint(path: string): boolean {
  return /\/(index|main)\.(tsx|jsx|ts|js)$/.test(path)
}

function isComponentFile(path: string): boolean {
  return /\.(tsx|jsx|ts|js)$/.test(path)
}

function isGeneratedFilePath(path: string): boolean {
  return /\/file-\d+\.[a-z0-9]+$/i.test(path)
}

function isStyleFile(path: string): boolean {
  return /\.(css|scss|sass|less)$/.test(path)
}

function isDeleteInstruction(code: string): boolean {
  return code.trim() === DELETE_FILE_SENTINEL
}

function convertCodeBlocksToFiles(codeBlocksMap: CodeBlocksMap): CodeFiles {
  const files: CodeFiles = {}

  for (const [filepath, code] of Object.entries(codeBlocksMap)) {
    const normalizedPath = normalizePath(filepath)
    const deleted = isDeleteInstruction(code)

    files[normalizedPath] = {
      code: deleted ? "" : code,
      active: false,
      deleted,
    }
  }

  const activeFiles = Object.keys(files).filter((path) => !files[path].deleted)
  const hasExplicitAppFile = activeFiles.some(isAppEntrypoint)
  const hasRuntimeEntrypoint = activeFiles.some(isRuntimeEntrypoint)

  if (!activeFiles.some((path) => path === "/styles.css")) {
    const styleCandidates = activeFiles.filter(
      (path) => isGeneratedFilePath(path) && isStyleFile(path)
    )

    if (styleCandidates.length === 1) {
      const styleFile = files[styleCandidates[0]]
      delete files[styleCandidates[0]]
      files["/styles.css"] = {
        ...styleFile,
        active: false,
      }
    }
  }

  if (!hasExplicitAppFile && !hasRuntimeEntrypoint) {
    const componentCandidates = activeFiles.filter(
      path => isComponentFile(path) && !isRuntimeEntrypoint(path)
    )

    const renameCandidate = componentCandidates.find(isGeneratedFilePath)

    if (componentCandidates.length === 1) {
      const file = files[componentCandidates[0]]
      delete files[componentCandidates[0]]
      files["/App.tsx"] = {
        ...file,
        active: true,
      }
      return files
    }

    if (renameCandidate) {
      const file = files[renameCandidate]
      delete files[renameCandidate]
      files["/App.tsx"] = {
        ...file,
        active: true,
      }
      return files
    }
  }

  const activePath =
    activeFiles.find(isAppEntrypoint) ??
    activeFiles.find(isRuntimeEntrypoint) ??
    activeFiles.find(isComponentFile)

  if (activePath) {
    files[activePath] = {
      ...files[activePath],
      active: true,
    }
  }

  return files
}

export function extractMultiFileCode(text: string): CodeFiles {
  return convertCodeBlocksToFiles(parseCodeBlocks(text))
}

export function extractMultiFileCodeIncremental(text: string): CodeFiles {
  return convertCodeBlocksToFiles(parseCodeBlocksIncremental(text))
}

/**
 * Check if AI response contains multi-file code blocks
 */
export function hasMultiFileCode(text: string): boolean {
  const files = extractMultiFileCode(text)
  return Object.keys(files).length > 0
}
