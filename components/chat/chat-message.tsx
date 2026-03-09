"use client"

import * as React from "react"
import { User, Bot, Copy, Check, ChevronDown, ChevronUp } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Message } from "ai/react"

interface ChatMessageProps {
  message: Message
  className?: string
  isStreaming?: boolean
}

const COLLAPSE_THRESHOLD = 600
const COLLAPSED_MAX_HEIGHT = "max-h-[22rem]"

function extractAssistantDisplayContent(content: string) {
  const codeBlockMatches = content.match(/```[\s\S]*?```/g) ?? []
  const textOnly = content.replace(/```[\s\S]*?```/g, "\n\n").trim()

  if (codeBlockMatches.length === 0) {
    return {
      content,
      codeBlockCount: 0,
    }
  }

  return {
    content: textOnly || "Code has been generated and synced to the editor and preview.",
    codeBlockCount: codeBlockMatches.length,
  }
}

function extractAssistantStreamingContent(content: string) {
  const withoutClosedBlocks = content.replace(/```[\s\S]*?```/g, "\n\n")
  const withoutOpenBlockTail = withoutClosedBlocks.replace(
    /```[\s\S]*$/g,
    "\n\nGenerating code in the editor...\n"
  )

  return withoutOpenBlockTail.trim() || "Generating response..."
}

// Custom code component for syntax highlighting
function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false)
  const match = /language-(\w+)/.exec(className || "")
  const language = match ? match[1] : ""
  const codeString = String(children).replace(/\n$/, "")

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Inline code (no language specified or short single-line)
  if (!match || (codeString.length < 100 && !codeString.includes("\n"))) {
    return (
      <code
        className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[0.875em] text-zinc-800 dark:bg-zinc-700/60 dark:text-zinc-200"
        {...props}
      >
        {children}
      </code>
    )
  }

  // Code block with syntax highlighting
  return (
    <div className="group relative my-4 max-w-full overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-900 shadow-lg dark:border-zinc-700/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/80 px-4 py-2">
        <span className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">
          {language}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          className="h-6 gap-1.5 px-2 text-xs text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
        >
          {copied ? (
            <>
              <Check className="size-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      {/* Code */}
      <div className="max-w-full overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: "1.6",
            minWidth: "100%",
            width: "max-content",
          }}
          codeTagProps={{
            style: {
              fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
            },
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function ChatMessageComponent({
  message,
  className,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const assistantDisplay = React.useMemo(
    () =>
      isUser
        ? { content: message.content, codeBlockCount: 0 }
        : extractAssistantDisplayContent(message.content),
    [isUser, message.content]
  )
  const streamingAssistantContent = React.useMemo(
    () => (isUser ? message.content : extractAssistantStreamingContent(message.content)),
    [isUser, message.content]
  )
  const shouldShowCollapse = !isUser && assistantDisplay.content.length > COLLAPSE_THRESHOLD

  React.useEffect(() => {
    setIsCollapsed(false)
  }, [message.id])

  return (
    <div
      className={cn(
        "group flex gap-3 py-5",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <Avatar
        size="default"
        className={cn(
          "mt-0.5 shrink-0 shadow-sm",
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-violet-600"
            : "bg-gradient-to-br from-emerald-500 to-teal-600"
        )}
      >
        <AvatarFallback
          className={cn(
            "bg-transparent font-semibold text-white",
            isUser ? "text-[0.7rem]" : "text-[0.65rem]"
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "min-w-0 flex-col gap-1",
          isUser ? "max-w-[85%] items-end" : "w-full max-w-full items-start"
        )}
      >
        {shouldShowCollapse && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="size-3" />
                Expand response
              </>
            ) : (
              <>
                <ChevronUp className="size-3" />
                Collapse response
              </>
            )}
          </button>
        )}

        <div
          className={cn(
            "max-w-full overflow-hidden rounded-2xl px-4 py-2.5 shadow-sm transition-shadow",
            isUser
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
              : "border border-zinc-200/80 bg-white text-zinc-900 dark:border-zinc-700/60 dark:bg-zinc-800/90 dark:text-zinc-100",
            isCollapsed && `relative overflow-y-auto pr-2 ${COLLAPSED_MAX_HEIGHT}`
          )}
        >
          {isCollapsed && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-zinc-800/90 to-transparent" />
          )}
          
          {isStreaming && !isUser ? (
            <div className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {streamingAssistantContent}
            </div>
          ) : (
            <div
              className={cn(
                "prose prose-sm max-w-none overflow-hidden",
                !isUser && "prose-zinc dark:prose-invert",
                isUser && [
                  "prose-invert",
                  "prose-p:text-white/95 prose-p:leading-relaxed",
                  "prose-strong:text-white prose-strong:font-semibold",
                  "prose-code:bg-white/20 prose-code:text-white prose-code:rounded-md prose-code:px-1.5 prose-code:py-0.5",
                  "prose-pre:bg-white/10 prose-pre:border-white/20",
                  "prose-a:text-white prose-a:underline-white/60 hover:prose-a:text-white",
                ].join(" "),
                !isUser && [
                  "prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100",
                  "prose-p:text-zinc-700 dark:prose-p:text-zinc-300",
                  "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100",
                  "prose-a:text-indigo-600 dark:prose-a:text-indigo-400",
                ].join(" ")
              )}
            >
              <ReactMarkdown
                components={{
                  code: CodeBlock,
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                  ),
                  h1: ({ children }) => (
                    <h1 className="mb-3 mt-4 text-xl font-bold first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-2 mt-3 text-lg font-semibold first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-2 text-base font-medium first:mt-0">
                      {children}
                    </h3>
                  ),
                }}
              >
              {assistantDisplay.content}
            </ReactMarkdown>
            {!isUser && assistantDisplay.codeBlockCount > 0 && (
              <div className="mt-3 rounded-lg border border-indigo-200/70 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                {assistantDisplay.codeBlockCount} code block
                {assistantDisplay.codeBlockCount > 1 ? "s were" : " was"} moved to the code editor and preview.
              </div>
            )}
          </div>
        )}
      </div>

        {/* Timestamp (optional future enhancement) */}
        {/* <span className="text-[10px] text-muted-foreground/60">
          {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
        </span> */}
      </div>
    </div>
  )
}

export const ChatMessage = React.memo(ChatMessageComponent)
