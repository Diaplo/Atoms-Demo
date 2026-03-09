"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Save, Loader2, FileCode } from "lucide-react"

interface SaveVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (description: string) => Promise<void>
  isSaving?: boolean
  fileCount?: number
}

export function SaveVersionDialog({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  fileCount = 0,
}: SaveVersionDialogProps) {
  const [description, setDescription] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => setDescription(""), 200)
    }
  }, [open])

  const handleSave = async () => {
    await onSave(description.trim() || "Manual save")
    setDescription("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSave()
    }
  }

  const suggestions = [
    "Fixed layout issues",
    "Added new feature",
    "Refactored code",
    "Updated styling",
    "Bug fixes",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-zinc-200 bg-white shadow-2xl sm:max-w-md dark:border-zinc-800 dark:bg-zinc-950">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-100 to-orange-50 p-2 dark:from-amber-500/20 dark:to-amber-600/10">
              <Save className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Save Version
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400">
                Create a checkpoint of your current code
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <FileCode className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {fileCount}
              </span>
              {" "}file{fileCount !== 1 ? "s" : ""} will be saved
            </span>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Description{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                (optional)
              </span>
            </Label>
            <Textarea
              ref={textareaRef}
              id="description"
              placeholder="What changed in this version?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              rows={3}
              className="resize-none border-zinc-300 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-amber-400 focus-visible:ring-amber-400/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Press{" "}
              <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                Cmd/Ctrl
              </kbd>
              {" + "}
              <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                Enter
              </kbd>
              {" "}to save quickly
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500 dark:text-zinc-400">
              Quick labels
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDescription(suggestion)}
                  disabled={isSaving}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-zinc-200 bg-zinc-50 sm:gap-0 dark:border-zinc-800 dark:bg-zinc-900">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Save Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
