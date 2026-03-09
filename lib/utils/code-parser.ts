/**
 * Code Block Parser for Markdown
 * 
 * Parses streaming markdown responses from LLM and extracts code blocks
 * with file paths from various comment styles.
 */

/**
 * Represents a parsed code block with metadata
 */
export interface ParsedCodeBlock {
  filepath: string;
  code: string;
  language: string;
}

/**
 * Result of parsing markdown code blocks
 * Maps filepath to code content
 */
export type CodeBlocksMap = Record<string, string>;

/**
 * Regex patterns for code block detection
 */
const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
const PARTIAL_CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*)$/;

/**
 * Regex patterns for filepath extraction
 */
const FILEPATH_PATTERNS = {
  // JavaScript/TypeScript: // filepath: filename.ext
  singleLineComment: /^\/\/\s*filepath:\s*(.+?)\s*$/m,
  // CSS: /* filepath: filename.ext */
  multiLineComment: /^\/\*\s*filepath:\s*(.+?)\s*\*\//m,
  // HTML: <!-- filepath: filename.ext -->
  htmlComment: /^<!--\s*filepath:\s*(.+?)\s*-->$/m,
} as const;

/**
 * Mapping of language to expected comment style
 */
const LANGUAGE_COMMENT_STYLES: Record<string, 'singleLine' | 'multiLine' | 'html'> = {
  // Single-line comment languages
  javascript: 'singleLine',
  typescript: 'singleLine',
  js: 'singleLine',
  ts: 'singleLine',
  jsx: 'singleLine',
  tsx: 'singleLine',
  // Multi-line comment languages
  css: 'multiLine',
  scss: 'multiLine',
  less: 'multiLine',
  // HTML-style comment languages
  html: 'html',
  xml: 'html',
  svg: 'html',
  markdown: 'html',
  md: 'html',
} as const;

/**
 * Extracts filepath from the first line of a code block
 * 
 * @param code - The code content to extract filepath from
 * @param language - The language identifier from the code fence
 * @returns The extracted filepath or null if not found
 * 
 * @example
 * ```ts
 * extractFilepath('// filepath: App.tsx\nconst x = 1;', 'typescript')
 * // Returns: 'App.tsx'
 * 
 * extractFilepath('/* filepath: styles.css *\/\n.container {}', 'css')
 * // Returns: 'styles.css'
 * 
 * extractFilepath('const x = 1;', 'typescript')
 * // Returns: null
 * ```
 */
export function extractFilepath(code: string, language: string): string | null {
  if (!code || typeof code !== 'string') {
    return null;
  }

  // Get the first line to check for filepath comment
  const firstLine = code.split('\n')[0]?.trim();
  
  if (!firstLine) {
    return null;
  }

  // Try to match based on language preference first
  const expectedStyle = LANGUAGE_COMMENT_STYLES[language.toLowerCase()];
  
  if (expectedStyle) {
    const pattern = FILEPATH_PATTERNS[
      expectedStyle === 'singleLine' ? 'singleLineComment' : 
      expectedStyle === 'multiLine' ? 'multiLineComment' : 'htmlComment'
    ];
    const match = firstLine.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  // Try all patterns if language-specific pattern didn't match
  for (const pattern of Object.values(FILEPATH_PATTERNS)) {
    const match = firstLine.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Removes the filepath comment from the beginning of code
 * 
 * @param code - The code content
 * @returns Code with filepath comment removed
 */
function removeFilepathComment(code: string): string {
  if (!code) return code;
  
  const lines = code.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  // Check if first line is a filepath comment
  const isFilepathComment = Object.values(FILEPATH_PATTERNS).some(
    pattern => pattern.test(firstLine)
  );
  
  if (isFilepathComment && lines.length > 0) {
    return lines.slice(1).join('\n');
  }
  
  return code;
}

/**
 * Parses a complete markdown text and extracts all code blocks
 * 
 * @param markdown - The markdown text containing code blocks
 * @returns Object mapping filepaths to code content
 * 
 * @example
 * ```ts
 * const markdown = `
 * \`\`\`tsx
 * // filepath: App.tsx
 * import React from 'react';
 * export default function App() {
 *   return <div>Hello</div>;
 * }
 * \`\`\`
 * 
 * \`\`\`css
 * /* filepath: styles.css *\/
 * .container { padding: 20px; }
 * \`\`\`
 * `;
 * 
 * parseCodeBlocks(markdown);
 * // Returns:
 * // {
 * //   "App.tsx": "import React from 'react';\nexport default function App() {\n  return <div>Hello</div>;\n}",
 * //   "styles.css": ".container { padding: 20px; }"
 * // }
 * ```
 */
export function parseCodeBlocks(markdown: string): CodeBlocksMap {
  const result: CodeBlocksMap = {};
  
  if (!markdown || typeof markdown !== 'string') {
    return result;
  }

  let match: RegExpExecArray | null;
  const processedFilepaths = new Set<string>();
  let blockIndex = 0;

  // Reset regex lastIndex
  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(markdown)) !== null) {
    const language = match[1] || 'text';
    let code = match[2] || '';
    
    // Trim trailing whitespace but preserve internal structure
    code = code.trimEnd();
    
    if (!code) {
      continue;
    }

    // Extract filepath from code
    let filepath = extractFilepath(code, language);
    
    // Generate default filepath if none found
    if (!filepath) {
      const extension = getExtensionForLanguage(language);
      filepath = `file-${blockIndex}.${extension}`;
    }
    
    // Handle duplicate filepaths
    let finalFilepath = filepath;
    let duplicateCount = 1;
    while (processedFilepaths.has(finalFilepath)) {
      const lastDot = filepath.lastIndexOf('.');
      if (lastDot > 0) {
        finalFilepath = `${filepath.substring(0, lastDot)}-${duplicateCount}${filepath.substring(lastDot)}`;
      } else {
        finalFilepath = `${filepath}-${duplicateCount}`;
      }
      duplicateCount++;
    }
    processedFilepaths.add(finalFilepath);
    
    // Remove filepath comment from code
    const cleanCode = removeFilepathComment(code);
    
    result[finalFilepath] = cleanCode;
    blockIndex++;
  }

  return result;
}

/**
 * Parses streaming/incremental markdown text and updates code blocks
 * 
 * This function handles partial markdown that may be incomplete,
 * such as during streaming responses from an LLM.
 * 
 * @param text - The current text chunk (can be partial)
 * @param previousBlocks - Previously parsed blocks to merge with
 * @returns Updated object mapping filepaths to code content
 * 
 * @example
 * ```ts
 * let blocks = {};
 * 
 * // First chunk (incomplete)
 * blocks = parseCodeBlocksIncremental('```tsx\n// filepath: App.tsx\nconst x', blocks);
 * // Returns: { "App.tsx": "const x" }
 * 
 * // Second chunk (continuation)
 * blocks = parseCodeBlocksIncremental(
 *   '```tsx\n// filepath: App.tsx\nconst x = 1;\n```',
 *   blocks
 * );
 * // Returns: { "App.tsx": "const x = 1;" }
 * ```
 */
export function parseCodeBlocksIncremental(
  text: string,
  previousBlocks: CodeBlocksMap = {}
): CodeBlocksMap {
  const result: CodeBlocksMap = { ...previousBlocks };
  
  if (!text || typeof text !== 'string') {
    return result;
  }

  // First, parse complete code blocks
  let match: RegExpExecArray | null;
  const processedFilepaths = new Set<string>();
  let blockIndex = Object.keys(result).length;

  // Reset regex lastIndex
  CODE_BLOCK_REGEX.lastIndex = 0;

  // Parse all complete code blocks
  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    const language = match[1] || 'text';
    let code = match[2] || '';
    
    code = code.trimEnd();
    
    if (!code) {
      continue;
    }

    let filepath = extractFilepath(code, language);
    
    if (!filepath) {
      const extension = getExtensionForLanguage(language);
      filepath = `file-${blockIndex}.${extension}`;
    }
    
    // Handle duplicate filepaths
    let finalFilepath = filepath;
    let duplicateCount = 1;
    while (processedFilepaths.has(finalFilepath)) {
      const lastDot = filepath.lastIndexOf('.');
      if (lastDot > 0) {
        finalFilepath = `${filepath.substring(0, lastDot)}-${duplicateCount}${filepath.substring(lastDot)}`;
      } else {
        finalFilepath = `${filepath}-${duplicateCount}`;
      }
      duplicateCount++;
    }
    processedFilepaths.add(finalFilepath);
    
    const cleanCode = removeFilepathComment(code);
    result[finalFilepath] = cleanCode;
    blockIndex++;
  }

  // Check for partial/incomplete code block at the end
  const partialMatch = text.match(PARTIAL_CODE_BLOCK_REGEX);
  
  if (partialMatch) {
    const language = partialMatch[1] || 'text';
    let code = partialMatch[2] || '';
    
    code = code.trimEnd();
    
    if (code) {
      let filepath = extractFilepath(code, language);
      
      if (!filepath) {
        const extension = getExtensionForLanguage(language);
        filepath = `file-${blockIndex}.${extension}`;
      }
      
      const cleanCode = removeFilepathComment(code);
      
      // For partial blocks, always update (they might be continuations)
      result[filepath] = cleanCode;
    }
  }

  return result;
}

/**
 * Gets the file extension for a given language identifier
 * 
 * @param language - The language identifier (e.g., 'typescript', 'css')
 * @returns The corresponding file extension
 */
function getExtensionForLanguage(language: string): string {
  const languageToExtension: Record<string, string> = {
    typescript: 'ts',
    ts: 'ts',
    javascript: 'js',
    js: 'js',
    tsx: 'tsx',
    jsx: 'jsx',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    xml: 'xml',
    json: 'json',
    markdown: 'md',
    md: 'md',
    python: 'py',
    ruby: 'rb',
    go: 'go',
    rust: 'rs',
    java: 'java',
    kotlin: 'kt',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    csharp: 'cs',
    cs: 'cs',
    php: 'php',
    sql: 'sql',
    shell: 'sh',
    bash: 'sh',
    sh: 'sh',
    yaml: 'yaml',
    yml: 'yaml',
    docker: 'dockerfile',
    dockerfile: 'dockerfile',
  };

  return languageToExtension[language.toLowerCase()] || 'txt';
}

/**
 * Extracts all code blocks with full metadata
 * 
 * @param markdown - The markdown text to parse
 * @returns Array of parsed code blocks with metadata
 */
export function parseCodeBlocksWithMetadata(markdown: string): ParsedCodeBlock[] {
  const result: ParsedCodeBlock[] = [];
  
  if (!markdown || typeof markdown !== 'string') {
    return result;
  }

  let match: RegExpExecArray | null;
  let blockIndex = 0;
  const processedFilepaths = new Set<string>();

  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(markdown)) !== null) {
    const language = match[1] || 'text';
    let code = match[2] || '';
    
    code = code.trimEnd();
    
    if (!code) {
      continue;
    }

    let filepath = extractFilepath(code, language);
    
    if (!filepath) {
      const extension = getExtensionForLanguage(language);
      filepath = `file-${blockIndex}.${extension}`;
    }
    
    // Handle duplicate filepaths
    let finalFilepath = filepath;
    let duplicateCount = 1;
    while (processedFilepaths.has(finalFilepath)) {
      const lastDot = filepath.lastIndexOf('.');
      if (lastDot > 0) {
        finalFilepath = `${filepath.substring(0, lastDot)}-${duplicateCount}${filepath.substring(lastDot)}`;
      } else {
        finalFilepath = `${filepath}-${duplicateCount}`;
      }
      duplicateCount++;
    }
    processedFilepaths.add(finalFilepath);
    
    const cleanCode = removeFilepathComment(code);
    
    result.push({
      filepath: finalFilepath,
      code: cleanCode,
      language,
    });
    
    blockIndex++;
  }

  return result;
}

/**
 * Detects if a string contains an incomplete code block
 * Useful for determining if more text is expected during streaming
 * 
 * @param text - The text to check
 * @returns true if there's an unclosed code block
 */
export function hasIncompleteCodeBlock(text: string): boolean {
  if (!text) return false;
  
  const codeBlockStarts = (text.match(/```/g) || []).length;
  return codeBlockStarts % 2 !== 0;
}

/**
 * Merges two code block maps, with newer values taking precedence
 * 
 * @param base - Base code blocks
 * @param update - New code blocks to merge
 * @returns Merged code blocks
 */
export function mergeCodeBlocks(
  base: CodeBlocksMap,
  update: CodeBlocksMap
): CodeBlocksMap {
  return {
    ...base,
    ...update,
  };
}
