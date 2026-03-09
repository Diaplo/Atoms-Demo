"use client"

import * as React from "react"
import { Send, Square, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: () => void
  onStop?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
  placeholder = "Send a message...",
  className,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = React.useState(false)

  // Auto-resize textarea based on content
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to get accurate scrollHeight
      textarea.style.height = "auto"
      // Set new height based on content (with max height constraint)
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${newHeight}px`
    }
  }, [])

  // Adjust height on input change
  React.useEffect(() => {
    adjustHeight()
  }, [input, adjustHeight])

  // Focus textarea on mount
  React.useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't handle during IME composition
    if (isComposing) return

    // Enter to send, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading && !disabled) {
        onSubmit()
        // Reset height after submit
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
          }
        }, 0)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value)
  }

  const handleSubmit = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSubmit()
      // Reset height after submit
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      }, 0)
    }
  }

  const handleStop = () => {
    onStop?.()
  }

  const canSend = input.trim().length > 0 && !isLoading && !disabled

  return (
    <div
      className={cn(
        "flex items-end gap-2 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-lg transition-all",
        "dark:border-zinc-700/60 dark:bg-zinc-800/90",
        "focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20",
        "dark:focus-within:border-indigo-500/50 dark:focus-within:ring-indigo-500/20",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          "min-h-[40px] max-h-[200px] flex-1 resize-none bg-transparent",
          "px-3 py-2 text-sm text-zinc-900 outline-none",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
          "dark:text-zinc-100",
          "disabled:cursor-not-allowed",
          "scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent",
          "dark:scrollbar-thumb-zinc-600"
        )}
        style={{ height: "auto" }}
      />

      {/* Action Buttons */}
      <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
        {/* Stop Button (when loading) */}
        {isLoading && onStop && (
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={handleStop}
            disabled={disabled}
            className="h-8 w-8 shrink-0"
            title="Stop generating"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Send Button */}
        <Button
          type="button"
          variant="default"
          size="icon-sm"
          onClick={handleSubmit}
          disabled={!canSend}
          className={cn(
            "h-8 w-8 shrink-0 transition-all",
            canSend && "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
          )}
          title={isLoading ? "Sending..." : "Send message"}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}