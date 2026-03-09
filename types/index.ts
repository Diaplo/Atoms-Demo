/**
 * Central type definitions for AI Builder Demo
 * Following AGENTS.md specifications
 */

// ============================================
// Chat Types
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt?: Date
}

export interface Chat {
  id: string
  projectId: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Code & Version Types
// ============================================

export interface CodeFile {
  code: string
  active?: boolean
  readOnly?: boolean
  deleted?: boolean
}

export type CodeFiles = Record<string, CodeFile>

export interface CodeVersion {
  id: string
  chatId: string
  messageId: string
  prompt?: string | null // The user prompt that generated this code
  version: number
  files: CodeFiles
  isManual: boolean
  description?: string | null
  createdAt: Date
}

// ============================================
// UI State Types
// ============================================

export type ViewTab = 'code' | 'preview' | 'split'

export interface BuilderState {
  // Current code
  currentFiles: CodeFiles
  activeFile: string | null
  
  // Chat
  messages: ChatMessage[]
  
  // Versions
  versions: CodeVersion[]
  currentVersionId: string | null
  
  // UI
  activeView: ViewTab
  isLoading: boolean
  error: string | null
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserSession {
  user: User | null
  isAuthenticated: boolean
}
