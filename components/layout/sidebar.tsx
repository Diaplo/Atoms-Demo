"use client"

import * as React from "react"
import { Plus, PanelLeftClose, PanelLeft, Sparkles, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChatList } from "@/components/chat/chat-list"
import { SettingsTrigger } from "@/components/settings/settings-trigger"
import { logoutAction } from "@/app/(auth)/actions"
import { getBrowserSupabaseClient } from "@/lib/supabase/client"
import {
  useDashboardWorkspaceStore,
  useWorkspaceActiveChatId,
} from "@/lib/store/dashboard-workspace-store"

interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
}

interface Chat {
  id: string
  title: string
  preview?: string
  createdAt: string
  updatedAt: string
}

interface SidebarBootstrapData {
  user: User | null
  chats: Chat[]
}

let cachedSidebarBootstrap: SidebarBootstrapData | null = null
let sidebarBootstrapPromise: Promise<SidebarBootstrapData> | null = null
let sidebarChatsPromise: Promise<Chat[]> | null = null

async function fetchSidebarBootstrap(force = false): Promise<SidebarBootstrapData> {
  if (!force) {
    if (cachedSidebarBootstrap) {
      return cachedSidebarBootstrap
    }

    if (sidebarBootstrapPromise) {
      return sidebarBootstrapPromise
    }
  }

  const previousBootstrap = cachedSidebarBootstrap
  const request = (async () => {
    const [userResponse, chatsResponse] = await Promise.all([
      fetch('/api/user', {
        credentials: 'same-origin',
      }),
      fetch('/api/chats', {
        credentials: 'same-origin',
      }),
    ])

    const user = userResponse.ok ? ((await userResponse.json()) as User) : null
    const chats = chatsResponse.ok ? ((await chatsResponse.json()) as Chat[]) : []
    const bootstrapData = { user, chats }

    cachedSidebarBootstrap = bootstrapData
    return bootstrapData
  })()

  sidebarBootstrapPromise = request

  try {
    return await request
  } catch (error) {
    cachedSidebarBootstrap = previousBootstrap
    throw error
  } finally {
    if (sidebarBootstrapPromise === request) {
      sidebarBootstrapPromise = null
    }
  }
}

async function fetchSidebarChats(force = false): Promise<Chat[]> {
  if (!force && cachedSidebarBootstrap) {
    return cachedSidebarBootstrap.chats
  }

  if (sidebarChatsPromise) {
    return sidebarChatsPromise
  }

  const previousChats = cachedSidebarBootstrap?.chats
  const request = (async () => {
    const response = await fetch('/api/chats', {
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error(`Failed to load chats (${response.status})`)
    }

    const chats = (await response.json()) as Chat[]

    cachedSidebarBootstrap = {
      user: cachedSidebarBootstrap?.user ?? null,
      chats,
    }

    return chats
  })()

  sidebarChatsPromise = request

  try {
    return await request
  } catch (error) {
    if (previousChats) {
      cachedSidebarBootstrap = {
        user: cachedSidebarBootstrap?.user ?? null,
        chats: previousChats,
      }
    }

    throw error
  } finally {
    if (sidebarChatsPromise === request) {
      sidebarChatsPromise = null
    }
  }
}

function setCachedSidebarChats(chats: Chat[]) {
  cachedSidebarBootstrap = {
    user: cachedSidebarBootstrap?.user ?? null,
    chats,
  }
}

function removeCachedSidebarChat(chatId: string) {
  if (!cachedSidebarBootstrap) {
    return
  }

  setCachedSidebarChats(
    cachedSidebarBootstrap.chats.filter((chat) => chat.id !== chatId)
  )
}

interface SidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
  onChatSelect?: (chatId: string, messages?: any[]) => void
  onNewChat?: (chatId: string) => void
}

export function Sidebar({
  className,
  isCollapsed = false,
  onToggle,
  onChatSelect,
  onNewChat,
}: SidebarProps) {
  const [user, setUser] = React.useState<User | null>(null)
  const [chats, setChats] = React.useState<Chat[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [deletingChatId, setDeletingChatId] = React.useState<string | null>(null)
  const activeChatId = useWorkspaceActiveChatId()
  const setActiveChat = useDashboardWorkspaceStore((state) => state.setActiveChat)
  const resetWorkspace = useDashboardWorkspaceStore((state) => state.resetWorkspace)

  React.useEffect(() => {
    let isCancelled = false

    const initializeSidebar = async () => {
      setIsLoading(true)

      try {
        const bootstrapData = await fetchSidebarBootstrap()

        if (isCancelled) {
          return
        }

        setUser(bootstrapData.user)
        setChats(bootstrapData.chats)
      } catch (error) {
        if (!isCancelled) {
          console.error('Error loading sidebar bootstrap:', error)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void initializeSidebar()

    return () => {
      isCancelled = true
    }
  }, [])

  const loadChats = React.useCallback(async (force = false) => {
    try {
      const chatsData = await fetchSidebarChats(force)
      setChats(chatsData)
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const handleChatsUpdated = () => {
      void loadChats(true)
    }

    window.addEventListener('builder:chats-updated', handleChatsUpdated)
    return () => {
      window.removeEventListener('builder:chats-updated', handleChatsUpdated)
    }
  }, [loadChats])

  const handleNewChat = async () => {
    resetWorkspace()
    onNewChat?.("")
  }

  const handleChatSelect = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        credentials: 'same-origin',
      })
      if (response.ok) {
        const chatData = await response.json()
        setActiveChat(chatId, chatData.messages || [])
        onChatSelect?.(chatId, chatData.messages)
        return
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    }

    setActiveChat(chatId, [])
    onChatSelect?.(chatId, [])
  }

  const handleDeleteChat = React.useCallback(async (chatId: string) => {
    if (deletingChatId === chatId) {
      return
    }

    const chatToDelete = chats.find((chat) => chat.id === chatId)
    if (!chatToDelete) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${chatToDelete.title}"? This will also remove its messages and version history.`
    )

    if (!confirmed) {
      return
    }

    setDeletingChatId(chatId)

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
        credentials: "same-origin",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete chat (${response.status})`)
      }

      setChats((currentChats) =>
        currentChats.filter((chat) => chat.id !== chatId)
      )
      removeCachedSidebarChat(chatId)

      if (activeChatId === chatId) {
        resetWorkspace()
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
    } finally {
      setDeletingChatId((currentChatId) =>
        currentChatId === chatId ? null : currentChatId
      )
    }
  }, [activeChatId, chats, deletingChatId, resetWorkspace])

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      const browserSupabase = getBrowserSupabaseClient()

      if (!browserSupabase) {
        throw new Error('Browser Supabase client is unavailable during server rendering')
      }

      const { error } = await browserSupabase.auth.signOut({ scope: 'local' })

      if (error) {
        throw error
      }

      window.location.href = '/login'
    } catch (error) {
      console.error('Error logging out in browser, falling back to server action:', error)

      try {
        await logoutAction()
      } catch (serverError) {
        console.error('Error logging out:', serverError)
        setIsLoggingOut(false)
      }
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isCollapsed) {
    return (
      <aside
        className={cn(
          "flex h-screen w-16 flex-col border-r border-border/50 bg-sidebar",
          "transition-all duration-300 ease-in-out",
          className
        )}
      >
        <div className="flex h-16 items-center justify-center border-b border-border/50">
          <button
            onClick={onToggle}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleChatSelect(chat.id)}
              className={cn(
                "mx-auto size-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                activeChatId === chat.id 
                  ? "bg-violet-500/30 text-violet-600" 
                  : "bg-muted/30 dark:bg-muted/20 hover:bg-muted/50"
              )}
            >
              <span className="text-xs font-medium">{chat.title[0]?.toUpperCase() || 'N'}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 p-2">
          <div className="flex flex-col gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        "flex h-screen w-80 flex-col border-r border-border/50 bg-sidebar",
        "transition-all duration-300 ease-in-out",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 dark:from-violet-500/30 dark:via-fuchsia-500/30 dark:to-pink-500/30">
            <Sparkles className="size-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">AI Builder</span>
            <span className="text-[10px] text-muted-foreground">by Atoms</span>
          </div>
        </div>

        <button
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="px-3 py-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-sm font-medium"
          size="default"
          onClick={handleNewChat}
        >
          <Plus className="size-4" />
          <span>New Chat</span>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Recent Chats
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading chats...</div>
          </div>
        ) : (
          <ChatList
            chats={chats.map(chat => ({
              id: chat.id,
              title: chat.title,
              timestamp: new Date(chat.updatedAt),
              preview: chat.preview,
            }))}
            activeChatId={activeChatId}
            onChatSelect={handleChatSelect}
            onDeleteChat={handleDeleteChat}
            deletingChatId={deletingChatId}
            className="h-[calc(100%-2rem)]"
          />
        )}
      </div>

      <div className="border-t border-border/50 p-3">
        <div className="flex flex-col gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Avatar size="sm">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-medium text-white">
                    {user ? getUserInitials(user.fullName) : 'JD'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col items-start flex-1">
                <span className="text-xs font-medium truncate">{user?.fullName || 'Loading...'}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <SettingsTrigger variant="ghost" size="sm" label="Settings" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="size-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
