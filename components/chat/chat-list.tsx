"use client"

import * as React from "react"
import { Loader2, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ChatItem {
  id: string
  title: string
  timestamp: Date
  preview?: string
}

interface ChatListProps {
  chats: ChatItem[]
  activeChatId?: string
  onChatSelect?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => Promise<void> | void
  deletingChatId?: string | null
  className?: string
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function ChatList({
  chats,
  activeChatId,
  onChatSelect,
  onDeleteChat,
  deletingChatId = null,
  className,
}: ChatListProps) {
  const chatMenuItemClass =
    "border border-transparent hover:border-zinc-950 data-[highlighted]:border-zinc-950 dark:hover:border-zinc-100 dark:data-[highlighted]:border-zinc-100"

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="space-y-0.5 p-2">
        {chats.map((chat) => {
          const isDeleting = deletingChatId === chat.id

          return (
            <div key={chat.id} className="group relative">
              <button
                onClick={() => onChatSelect?.(chat.id)}
                disabled={isDeleting}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 pr-11 text-left transition-all duration-200",
                  "hover:bg-accent/50 dark:hover:bg-accent/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  activeChatId === chat.id && "bg-accent dark:bg-accent/40"
                )}
              >
                <div className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
                  "bg-muted/50 dark:bg-muted/30",
                  "group-hover:bg-primary/10 dark:group-hover:bg-primary/20",
                  activeChatId === chat.id && "bg-primary/15 dark:bg-primary/25"
                )}>
                  <MessageSquare className="size-3 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "truncate pr-2 text-sm font-medium",
                      "text-foreground/90 dark:text-foreground/80",
                      activeChatId === chat.id && "text-foreground"
                    )}>
                      {chat.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">
                      {formatTimestamp(chat.timestamp)}
                    </span>
                  </div>
                  {chat.preview && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground/60 dark:text-muted-foreground/50">
                      {chat.preview}
                    </p>
                  )}
                </div>
              </button>

              {onDeleteChat && (
                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
                        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        activeChatId === chat.id
                          ? "opacity-100"
                          : "opacity-70 group-hover:opacity-100 group-focus-within:opacity-100"
                      )}
                      onClick={(event) => event.stopPropagation()}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-3.5" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={6}
                      className="w-40 bg-white dark:bg-zinc-950"
                    >
                      <DropdownMenuItem
                        className={chatMenuItemClass}
                        variant="destructive"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          void onDeleteChat(chat.id)
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
