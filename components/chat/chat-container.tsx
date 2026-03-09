"use client"

import * as React from "react"
import { useChat } from "ai/react"
import { Sparkles, AlertCircle, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { useApiConfig, useHasApiKey } from "@/lib/store/settings-store"
import { useBuilderActions, useCurrentFiles } from "@/lib/store/builder-store"
import { useDashboardWorkspaceStore } from "@/lib/store/dashboard-workspace-store"
import {
  extractReactCode,
  extractMultiFileCode,
} from "@/lib/ai/code-extractor"
import {
  getPrimaryFilePath,
  hasCodeFiles,
  mergeCodeFiles,
  normalizeCodeFiles,
} from "@/lib/utils/code-files"
import type { CodeVersion } from "@/types"

export interface ChatContainerRef {
  reset: () => void
}

interface ChatContainerProps {
  className?: string
  initialMessages?: Array<{
    id: string
    role: "user" | "assistant" | "system"
    content: string
  }>
  activeChatId?: string
  isHydratingHistory?: boolean
  onSettingsClick?: () => void
}

const EXAMPLE_PROMPTS = [
  {
    title: "贪吃蛇游戏",
    prompt:
      "生成一个支持键盘操作的贪吃蛇游戏，包含分数显示、暂停继续和重新开始按钮。",
  },
  {
    title: "任务看板",
    prompt:
      "做一个现代风格的任务看板，包含待办、进行中、已完成三列，卡片支持拖拽并有完整的交互状态。",
  },
  {
    title: "数据仪表盘",
    prompt:
      "生成一个 SaaS 数据仪表盘首页，包含 KPI 卡片、趋势图区域、最近活动列表和响应式布局。",
  },
  {
    title: "产品落地页",
    prompt:
      "设计一个有高级感的产品落地页，包含 Hero 区、功能介绍、用户评价、价格方案，并适配移动端。",
  },
] as const

function normalizeVersion(version: any): CodeVersion {
  return {
    ...version,
    files: normalizeCodeFiles(version.files),
    createdAt: new Date(version.createdAt),
  }
}

function extractFilesFromMessageContent(content: string) {
  const multiFileCode = extractMultiFileCode(content)

  if (Object.keys(multiFileCode).length > 0) {
    return multiFileCode
  }

  const extractedCode = extractReactCode(content)
  if (!extractedCode) {
    return null
  }

  return {
    "/App.tsx": {
      code: extractedCode,
      active: true,
    },
  }
}

export const ChatContainer = React.forwardRef<ChatContainerRef, ChatContainerProps>(
  function ChatContainer(
    {
      className,
      initialMessages = [],
      activeChatId,
      isHydratingHistory = false,
      onSettingsClick,
    },
    ref
  ) {
    const scrollAreaRef = React.useRef<HTMLDivElement | null>(null)
    const scrollViewportRef = React.useRef<HTMLElement | null>(null)
    const draftChatIdRef = React.useRef(`draft-${crypto.randomUUID()}`)

    const apiConfig = useApiConfig()
    const hasApiKey = useHasApiKey()
    const currentFiles = useCurrentFiles()
    const {
      clearMessages,
      clearFiles,
      clearVersions,
      setMessages: setStoreMessages,
      applyGeneratedCode,
      addVersion,
      selectVersion,
      setStreaming,
    } = useBuilderActions()
    const bindActiveChatId = useDashboardWorkspaceStore((state) => state.bindActiveChatId)

    const userScrolledUpRef = React.useRef(false)
    const lastSubmittedPromptRef = React.useRef<string | null>(null)
    const lastAppliedAssistantContentRef = React.useRef("")
    const currentFilesRef = React.useRef(currentFiles)
    const activeChatIdRef = React.useRef<string | undefined>(activeChatId)
    const ensurePersistChatIdPromiseRef = React.useRef<Promise<string> | null>(null)
    const chatSessionIdRef = React.useRef(activeChatId ?? draftChatIdRef.current)
    const [pendingPrompt, setPendingPrompt] = React.useState<string | null>(null)
    const stableInitialMessages = React.useMemo(
      () =>
        initialMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
      [initialMessages]
    )

    const activeKey = apiConfig
    const chatId = chatSessionIdRef.current

    React.useEffect(() => {
      activeChatIdRef.current = activeChatId
    }, [activeChatId])

    React.useEffect(() => {
      currentFilesRef.current = currentFiles
    }, [currentFiles])

    React.useEffect(() => {
      console.log("[Chat Container] Workspace changed", {
        activeChatId: activeChatId ?? null,
        chatId,
        initialMessageCount: stableInitialMessages.length,
      })
    }, [activeChatId, chatId, stableInitialMessages.length])

    const ensurePersistChatId = React.useCallback(async () => {
      if (activeChatIdRef.current) {
        return activeChatIdRef.current
      }

      if (!ensurePersistChatIdPromiseRef.current) {
        ensurePersistChatIdPromiseRef.current = (async () => {
          console.log("[Chat Container] Creating chat for draft conversation")

          const response = await fetch("/api/chats", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: "New Chat" }),
          })

          if (!response.ok) {
            throw new Error(`Failed to create chat (${response.status})`)
          }

          const newChat = await response.json()
          activeChatIdRef.current = newChat.id
          bindActiveChatId(newChat.id)
          window.dispatchEvent(new Event("builder:chats-updated"))

          console.log("[Chat Container] Draft chat bound", {
            activeChatId: newChat.id,
          })

          return newChat.id as string
        })()
          .finally(() => {
            ensurePersistChatIdPromiseRef.current = null
          })
      }

      return ensurePersistChatIdPromiseRef.current
    }, [bindActiveChatId])

    const {
      messages,
      input,
      setInput,
      handleInputChange,
      handleSubmit,
      isLoading,
      stop,
      error,
      setMessages,
    } = useChat({
      id: chatId,
      api: "/api/chat",
      initialMessages: stableInitialMessages,
      credentials: "same-origin",
      body: {
        apiKey: activeKey?.key,
        baseUrl: activeKey?.baseUrl,
        model: activeKey?.modelId,
      },
      fetch: async (requestInfo, init) => {
        if (!activeKey?.isValid) {
          throw new Error("No API key configured. Please add an API key in settings.")
        }

        const response = await fetch(requestInfo, init)
        return response
      },
      onFinish: async (message) => {
        setStreaming(false)
        setPendingPrompt(null)
        const persistedChatId =
          activeChatIdRef.current ??
          (await ensurePersistChatId().catch((persistError) => {
            console.error("[Chat Container] Failed to resolve chat before assistant persistence:", persistError)
            return undefined
          }))

        if (message.role !== "assistant" || !message.content.trim() || !persistedChatId) {
          console.log("[Chat Container] Skip assistant persistence", {
            role: message.role,
            hasContent: Boolean(message.content.trim()),
            activeChatId: persistedChatId ?? null,
          })
          return
        }

        try {
          console.log("[Chat Container] Persisting assistant message", {
            activeChatId: persistedChatId,
            contentLength: message.content.length,
          })
          const savedMessageResponse = await fetch(`/api/chats/${persistedChatId}`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: "assistant",
              content: message.content,
            }),
          })

          if (!savedMessageResponse.ok) {
            throw new Error(`Failed to save assistant message (${savedMessageResponse.status})`)
          }

          const savedMessage = await savedMessageResponse.json()
          const filesToPersist = extractFilesFromMessageContent(message.content)

          window.dispatchEvent(new Event("builder:chats-updated"))

          if (!filesToPersist) {
            lastSubmittedPromptRef.current = null
            return
          }

          const nextFilesSnapshot = mergeCodeFiles(
            currentFilesRef.current,
            filesToPersist,
            getPrimaryFilePath(filesToPersist)
          )

          const versionResponse = await fetch(`/api/chats/${persistedChatId}/versions`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              files: filesToPersist,
              messageId: savedMessage.id,
              prompt: lastSubmittedPromptRef.current,
              isManual: false,
            }),
          })

          if (!versionResponse.ok) {
            throw new Error(`Failed to create version (${versionResponse.status})`)
          }

          const version = {
            ...normalizeVersion(await versionResponse.json()),
            files: nextFilesSnapshot,
          }
          addVersion(version)
          selectVersion(version.id)
        } catch (streamError) {
          console.error("Error finalizing assistant response:", streamError)
        } finally {
          lastSubmittedPromptRef.current = null
        }
      },
      onError: (chatError) => {
        setStreaming(false)
        setPendingPrompt(null)
        console.error("[Chat Container] Chat error:", chatError)
      },
    })

    const builderMessages = React.useMemo(
      () =>
        messages.map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant" | "system",
          content: message.content,
        })),
      [messages]
    )
    const hasVisiblePendingPrompt =
      Boolean(pendingPrompt) &&
      !builderMessages.some(
        (message) => message.role === "user" && message.content === pendingPrompt
      )
    const visibleMessages = React.useMemo(
      () =>
        hasVisiblePendingPrompt && pendingPrompt
          ? [
              ...builderMessages,
              {
                id: "pending-user-message",
                role: "user" as const,
                content: pendingPrompt,
              },
            ]
          : builderMessages,
      [builderMessages, hasVisiblePendingPrompt, pendingPrompt]
    )
    const displayMessages = React.useMemo(() => {
      const lastVisibleMessage = visibleMessages[visibleMessages.length - 1]
      const shouldRenderPendingAssistant =
        isLoading &&
        visibleMessages.length > 0 &&
        lastVisibleMessage?.role !== "assistant"

      return shouldRenderPendingAssistant
        ? [
            ...visibleMessages,
            {
              id: "pending-assistant-message",
              role: "assistant" as const,
              content: "",
            },
          ]
        : visibleMessages
    }, [isLoading, visibleMessages])

    React.useEffect(() => {
      if (
        pendingPrompt &&
        builderMessages.some(
          (message) => message.role === "user" && message.content === pendingPrompt
        )
      ) {
        setPendingPrompt(null)
      }
    }, [builderMessages, pendingPrompt])

    React.useEffect(() => {
      stop()
      setStreaming(false)
      setInput("")
      setMessages(stableInitialMessages)
      setPendingPrompt(null)
      lastSubmittedPromptRef.current = null
      lastAppliedAssistantContentRef.current = ""
      userScrolledUpRef.current = false
    }, [setInput, setMessages, setStreaming, stableInitialMessages, stop])

    React.useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          stop()
          setInput("")
          setMessages([])
          clearMessages()
          clearFiles()
          clearVersions()
          setStreaming(false)
          setPendingPrompt(null)
          lastSubmittedPromptRef.current = null
          lastAppliedAssistantContentRef.current = ""
          userScrolledUpRef.current = false
        },
      }),
      [clearFiles, clearMessages, clearVersions, setInput, setMessages, setStreaming, stop]
    )

    React.useEffect(() => {
      setStreaming(isLoading)
    }, [isLoading, setStreaming])

    React.useEffect(() => {
      setStoreMessages(builderMessages)
    }, [builderMessages, setStoreMessages])

    const handleExamplePrompt = React.useCallback((prompt: string) => {
      setInput(prompt)
    }, [setInput])

    const handleScroll = React.useCallback(() => {
      if (!scrollViewportRef.current) {
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
      userScrolledUpRef.current = !isNearBottom
    }, [])

    React.useEffect(() => {
      if (!scrollViewportRef.current || userScrolledUpRef.current) {
        return
      }

      const scrollToBottom = () => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight
        }
      }

      scrollToBottom()
      const timer = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timer)
    }, [messages, isLoading])

    React.useEffect(() => {
      if (messages.length === 0) {
        lastAppliedAssistantContentRef.current = ""
        return
      }

      const lastMessage = messages[messages.length - 1]

      if (lastMessage.role !== "assistant") {
        lastAppliedAssistantContentRef.current = ""
        return
      }

      if (lastMessage.content === lastAppliedAssistantContentRef.current) {
        return
      }

      if (isLoading) {
        return
      }

      const filesToApply = extractFilesFromMessageContent(lastMessage.content)

      if (filesToApply) {
        const isSeededAssistantMessage = stableInitialMessages.some(
          (message) =>
            message.id === lastMessage.id && message.role === "assistant"
        )

        if (isSeededAssistantMessage) {
          if (isHydratingHistory) {
            return
          }

          if (activeChatIdRef.current && hasCodeFiles(currentFilesRef.current)) {
            lastAppliedAssistantContentRef.current = lastMessage.content
            return
          }
        }

        lastAppliedAssistantContentRef.current = lastMessage.content
        applyGeneratedCode(filesToApply)
      }
    }, [applyGeneratedCode, isHydratingHistory, isLoading, messages, stableInitialMessages])

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!input.trim() || isLoading) {
        return
      }

      const prompt = input.trim()
      lastSubmittedPromptRef.current = prompt
      setPendingPrompt(prompt)
      userScrolledUpRef.current = false

      console.log("[Chat Container] Submit prompt", {
        activeChatId: activeChatIdRef.current ?? null,
        promptLength: prompt.length,
      })

      handleSubmit(event)
      void (async () => {
        try {
          const persistedChatId = await ensurePersistChatId()
          const response = await fetch(`/api/chats/${persistedChatId}`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: "user",
              content: prompt,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to save user message (${response.status})`)
          }

          console.log("[Chat Container] Persisted user message", {
            activeChatId: persistedChatId,
            status: response.status,
          })

          window.dispatchEvent(new Event("builder:chats-updated"))
        } catch (saveError) {
          setPendingPrompt(null)
          console.error("Error saving user message:", saveError)
        }
      })()
    }

    if (!hasApiKey) {
      return (
        <div className={cn("flex h-full min-h-0 flex-col", className)}>
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Configure Your API Key</h3>
                <p className="text-sm text-muted-foreground">
                  Add your OpenAI-compatible API key to start generating code with AI.
                </p>
              </div>
              {onSettingsClick && (
                <Button onClick={onSettingsClick} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Open Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-semibold">AI Chat</h2>
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSettingsClick}
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea
          className="min-h-0 flex-1 px-4"
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div
            className="space-y-4 py-4"
            ref={(element) => {
              if (element?.parentElement?.parentElement) {
                scrollViewportRef.current = element.parentElement.parentElement
              }
            }}
          >
            {visibleMessages.length === 0 && !isLoading && !pendingPrompt && (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Start Building with AI</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Describe the UI you want to create and I&apos;ll generate the React code for you.
                  </p>
                </div>
                <div className="w-full max-w-2xl space-y-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      Example Prompts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click a bubble to fill the input
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example.title}
                        type="button"
                        onClick={() => handleExamplePrompt(example.prompt)}
                        className={cn(
                          "group rounded-2xl border border-zinc-200/80 bg-white/90 p-4 text-left shadow-sm transition-all",
                          "hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
                          "dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-violet-500/50"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="inline-flex rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 transition-colors group-hover:bg-violet-500/15 dark:text-violet-300">
                            {example.title}
                          </div>
                          <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                            {example.prompt}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {displayMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={
                  isLoading &&
                  index === displayMessages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Failed to send message</span>
                <span className="text-muted-foreground">- {error.message}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <ChatInput
            input={input}
            onInputChange={(value) => {
              const nextEvent = {
                target: { value },
              } as React.ChangeEvent<HTMLTextAreaElement>

              handleInputChange(nextEvent)
            }}
            onSubmit={() =>
              handleFormSubmit({
                preventDefault: () => {},
              } as React.FormEvent<HTMLFormElement>)
            }
            isLoading={isLoading}
            onStop={stop}
          />
        </div>
      </div>
    )
  }
)
