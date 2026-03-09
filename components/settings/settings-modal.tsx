"use client"

import * as React from "react"
import { Eye, EyeOff, Key, Check, AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useSettingsStore,
} from "@/lib/store/settings-store"

interface SettingsModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { apiConfig, setApiConfig } = useSettingsStore()
  
  const [showKey, setShowKey] = React.useState(false)
  const [keyInput, setKeyInput] = React.useState("")
  const [baseUrlInput, setBaseUrlInput] = React.useState("")
  const [modelIdInput, setModelIdInput] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const storedConfig = apiConfig

  React.useEffect(() => {
    if (storedConfig) {
      setKeyInput(storedConfig.key)
      setBaseUrlInput(storedConfig.baseUrl)
      setModelIdInput(storedConfig.modelId)
    } else {
      setKeyInput("")
      setBaseUrlInput("")
      setModelIdInput("")
    }
    setError(null)
    setSuccess(false)
  }, [storedConfig])

  const validateInput = (): boolean => {
    setError(null)

    if (!keyInput.trim()) {
      setError("API key is required")
      return false
    }

    if (keyInput.length < 20) {
      setError("API key must be at least 20 characters")
      return false
    }

    if (!baseUrlInput.trim()) {
      setError("Base URL is required")
      return false
    }

    try {
      new URL(baseUrlInput)
    } catch {
      setError("Invalid base URL format")
      return false
    }

    if (!modelIdInput.trim()) {
      setError("Model ID is required")
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!validateInput()) return

    setIsSaving(true)
    setError(null)

    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      setApiConfig(keyInput.trim(), baseUrlInput.trim(), modelIdInput.trim())
      setSuccess(true)
      setShowKey(false)

      setTimeout(() => setSuccess(false), 2000)
    } catch {
      setError("Failed to save API key")
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave()
    }
  }

  const getStatusIndicator = () => {
    if (success) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
          <Check className="size-4" />
          <span>Saved</span>
        </div>
      )
    }

    if (storedConfig?.isValid) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <AlertCircle className="size-4" />
        <span>Not configured</span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[650px] md:max-w-[720px] lg:max-w-[800px] p-0 gap-0 overflow-hidden bg-white rounded-2xl border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-4 sm:p-6">
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                <Key className="size-5 sm:size-6 text-white" />
              </div>
              API Settings
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-2 text-sm">
              Configure your OpenAI-compatible API to enable AI-powered code generation.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2.5 sm:space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label htmlFor="api-key" className="text-sm font-semibold text-slate-700">
                  API Key
                </Label>
                {getStatusIndicator()}
              </div>
              <div className="relative group">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value)
                    setError(null)
                    setSuccess(false)
                  }}
                  onKeyDown={handleKeyDown}
                  className="h-11 sm:h-14 pl-4 sm:pl-5 pr-11 sm:pr-14 font-mono text-sm sm:text-base bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 sm:right-4.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-lg"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? (
                    <EyeOff className="size-4.5 sm:size-5.5" />
                  ) : (
                    <Eye className="size-4.5 sm:size-5.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3.5">
              <Label htmlFor="base-url" className="text-sm font-semibold text-slate-700">
                Base URL
              </Label>
              <Input
                id="base-url"
                type="url"
                placeholder="https://api.example.com/v1"
                value={baseUrlInput}
                onChange={(e) => {
                  setBaseUrlInput(e.target.value)
                  setError(null)
                  setSuccess(false)
                }}
                onKeyDown={handleKeyDown}
                className="h-11 sm:h-14 font-mono text-sm sm:text-base bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all rounded-xl"
              />
              <p className="text-xs text-slate-500">
                The base URL for your OpenAI-compatible API endpoint.
              </p>
            </div>

            <div className="space-y-2.5 sm:space-y-3.5">
              <Label htmlFor="model-id" className="text-sm font-semibold text-slate-700">
                Model ID
              </Label>
              <Input
                id="model-id"
                type="text"
                placeholder="e.g., gpt-4-turbo-preview, glm-4, etc."
                value={modelIdInput}
                onChange={(e) => {
                  setModelIdInput(e.target.value)
                  setError(null)
                  setSuccess(false)
                }}
                onKeyDown={handleKeyDown}
                className="h-11 sm:h-14 font-mono text-sm sm:text-base bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all rounded-xl"
              />
              <p className="text-xs text-slate-500">
                Enter the model ID you want to use for API calls.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 sm:gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <AlertCircle className="size-4 sm:size-5 shrink-0 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-3 pt-1.5 sm:pt-2.5">
              <div className="flex gap-2.5 sm:gap-3.5 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange?.(false)}
                  disabled={isSaving}
                  className="flex-1 h-10 sm:h-12 px-5 sm:px-6 border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-medium text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !keyInput.trim() || !baseUrlInput.trim() || !modelIdInput.trim()}
                  className="flex-1 h-10 sm:h-12 px-5 sm:px-7 text-white rounded-xl font-medium shadow-lg transition-all text-sm sm:text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-200"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4.5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4">
          <p className="text-xs sm:text-sm text-slate-600 text-center flex items-center justify-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg">🔒</span>
            <span className="font-medium">API keys are stored locally in your browser. Never share your keys with others.</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
