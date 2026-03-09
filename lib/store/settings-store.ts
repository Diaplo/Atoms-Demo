import * as React from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface OpenAICompatibleConfig {
  key: string
  baseUrl: string
  modelId: string
  isValid: boolean
  lastValidated?: number
}

interface SettingsState {
  apiConfig?: OpenAICompatibleConfig
  setApiConfig: (key: string, baseUrl: string, modelId: string) => void
  clearApiConfig: () => void
  hasApiKey: () => boolean
  validateKey: (key: string) => boolean
  validateBaseUrl: (url: string) => boolean
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiConfig: undefined,

      validateKey: (key: string): boolean => {
        if (!key || key.length < 20) {
          return false
        }
        return true
      },

      validateBaseUrl: (url: string): boolean => {
        if (!url) return false
        try {
          const parsed = new URL(url)
          return parsed.protocol === "http:" || parsed.protocol === "https:"
        } catch {
          return false
        }
      },

      setApiConfig: (key: string, baseUrl: string, modelId: string) => {
        const { validateKey, validateBaseUrl } = get()
        
        const isValid = validateKey(key) && validateBaseUrl(baseUrl)

        const config: OpenAICompatibleConfig = {
          key,
          baseUrl,
          modelId,
          isValid,
          lastValidated: Date.now(),
        }

        set({ apiConfig: config })
      },

      clearApiConfig: () => {
        set({ apiConfig: undefined })
      },

      hasApiKey: () => {
        return Boolean(get().apiConfig?.isValid)
      },
    }),
    {
      name: "ai-builder-settings",
    }
  )
)

export const useApiConfig = () => useSettingsStore((state) => state.apiConfig)

export const useHasApiKey = () => {
  const apiConfig = useSettingsStore((state) => state.apiConfig)
  return React.useMemo(() => Boolean(apiConfig?.isValid), [apiConfig])
}
