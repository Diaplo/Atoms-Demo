"use client"

import { BuilderLayout } from "@/components/builder"

/**
 * Dashboard Page - Main Builder Interface
 * 
 * Following AGENTS.md specifications:
 * - Layout: Chat Panel | Code Editor | Live Preview
 * - Sidebar width: 380px
 * - Editor width: 50%
 * - Preview width: 50%
 * 
 * Uses:
 * - BuilderLayout (orchestrates all components)
 * - ChatContainer (AI chat with streaming)
 * - CodeEditor (syntax-highlighted editor)
 * - PreviewPanel (Sandpack preview)
 * - VersionHistoryPanel (version management)
 */
export default function DashboardPage() {
  return <BuilderLayout className="h-full" defaultView="split" />
}
