const DEFAULT_CHAT_TITLE = "New Chat"
const MAX_CHAT_TITLE_LENGTH = 48
const MAX_CHAT_PREVIEW_LENGTH = 96

function normalizeText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function truncateText(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }

  return `${content.slice(0, maxLength - 3).trimEnd()}...`
}

export function isDefaultChatTitle(title?: string | null): boolean {
  const normalizedTitle = title?.trim().toLowerCase()
  return !normalizedTitle || normalizedTitle === "new chat" || normalizedTitle === "untitled"
}

export function deriveChatTitle(content: string): string {
  const normalized = normalizeText(content)

  if (!normalized) {
    return DEFAULT_CHAT_TITLE
  }

  return truncateText(normalized, MAX_CHAT_TITLE_LENGTH)
}

export function deriveChatPreview(content?: string | null): string | undefined {
  const normalized = normalizeText(content ?? "")

  if (!normalized) {
    return undefined
  }

  return truncateText(normalized, MAX_CHAT_PREVIEW_LENGTH)
}

export { DEFAULT_CHAT_TITLE }
