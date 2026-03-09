import {
  createBrowserClient,
  parse,
  serialize,
  type CookieOptions,
} from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return parse(document.cookie)[name]
        },
        set(name: string, value: string, options?: CookieOptions) {
          document.cookie = serialize(name, value, {
            path: '/',
            ...options,
          })
        },
        remove(name: string, options?: CookieOptions) {
          document.cookie = serialize(name, '', {
            path: '/',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )
}

let browserSupabaseClient: ReturnType<typeof createBrowserSupabaseClient> | null = null

export function getBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createBrowserSupabaseClient()
  }

  return browserSupabaseClient
}
