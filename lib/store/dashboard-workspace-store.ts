"use client"

import { create } from "zustand"

interface WorkspaceMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface DashboardWorkspaceState {
  activeChatId?: string
  initialMessages: WorkspaceMessage[]
  chatSessionKey: number
  hydrateVersions: boolean
  setActiveChat: (chatId: string, messages?: WorkspaceMessage[]) => void
  bindActiveChatId: (chatId: string) => void
  resetWorkspace: () => void
}

const initialState = {
  activeChatId: undefined,
  initialMessages: [],
  chatSessionKey: 0,
  hydrateVersions: false,
} satisfies Pick<
  DashboardWorkspaceState,
  "activeChatId" | "initialMessages" | "chatSessionKey" | "hydrateVersions"
>

export const useDashboardWorkspaceStore = create<DashboardWorkspaceState>((set) => ({
  ...initialState,

  setActiveChat: (chatId, messages = []) =>
    set((state) => ({
      activeChatId: chatId,
      initialMessages: messages,
      chatSessionKey: state.chatSessionKey + 1,
      hydrateVersions: true,
    })),

  bindActiveChatId: (chatId) =>
    set((state) => ({
      activeChatId: chatId,
      initialMessages: state.initialMessages,
      chatSessionKey: state.chatSessionKey,
      hydrateVersions: false,
    })),

  resetWorkspace: () =>
    set((state) => ({
      activeChatId: undefined,
      initialMessages: [],
      chatSessionKey: state.chatSessionKey + 1,
      hydrateVersions: false,
    })),
}))

export const useWorkspaceActiveChatId = () =>
  useDashboardWorkspaceStore((state) => state.activeChatId)

export const useWorkspaceInitialMessages = () =>
  useDashboardWorkspaceStore((state) => state.initialMessages)

export const useWorkspaceChatSessionKey = () =>
  useDashboardWorkspaceStore((state) => state.chatSessionKey)

export const useWorkspaceHydrateVersions = () =>
  useDashboardWorkspaceStore((state) => state.hydrateVersions)
