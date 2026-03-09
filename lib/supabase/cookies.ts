import type { CookieMethods, CookieOptions } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

type CookieRecord = {
  name: string
  value: string
}

type CookieStoreLike = {
  get(name: string): { value: string } | undefined
  getAll(): CookieRecord[]
  set(name: string, value: string, options?: CookieOptions): void
}

type RouteCookieMutation =
  | {
      type: 'set'
      name: string
      value: string
      options?: CookieOptions
    }
  | {
      type: 'remove'
      name: string
      options?: CookieOptions
    }

export function logAuthCookieSnapshot(
  _label: string,
  _cookies: Pick<CookieStoreLike, 'getAll'>
) {}

export function createServerCookieMethods(
  cookieStore: CookieStoreLike,
  _label: string
): CookieMethods {
  return {
    get(name) {
      return cookieStore.get(name)?.value
    },
    set(name, value, options) {
      cookieStore.set(name, value, options)
    },
    remove(name, options) {
      cookieStore.set(name, '', {
        ...options,
        maxAge: 0,
      })
    },
  }
}

export function createRouteHandlerCookieMethods(
  cookieStore: Pick<CookieStoreLike, 'get' | 'getAll'>,
  _label: string
) {
  const mutations: RouteCookieMutation[] = []

  return {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        mutations.push({
          type: 'set',
          name,
          value,
          options,
        })
      },
      remove(name, options) {
        mutations.push({
          type: 'remove',
          name,
          options,
        })
      },
    } satisfies CookieMethods,
    applyToResponse(response: NextResponse) {
      mutations.forEach(mutation => {
        if (mutation.type === 'set') {
          response.cookies.set(mutation.name, mutation.value, mutation.options)
          return
        }

        response.cookies.set(mutation.name, '', {
          ...mutation.options,
          maxAge: 0,
        })
      })
    },
    getMutations() {
      return [...mutations]
    },
  }
}

export function createMiddlewareCookieMethods(
  request: NextRequest,
  getResponse: () => NextResponse,
  _label: string
): CookieMethods {
  return {
    get(name) {
      return request.cookies.get(name)?.value
    },
    set(name, value, options) {
      request.cookies.set(name, value)
      getResponse().cookies.set(name, value, options)
    },
    remove(name, options) {
      request.cookies.set(name, '')
      getResponse().cookies.set(name, '', {
        ...options,
        maxAge: 0,
      })
    },
  }
}
