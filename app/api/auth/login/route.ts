import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerCookieMethods } from '@/lib/supabase/cookies'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()

  const cookieAdapter = createRouteHandlerCookieMethods(
    cookieStore,
    '[API Login]'
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieAdapter.cookies,
    }
  )

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('[API Login] Error:', error.message, error.status)
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  const response = NextResponse.json({
    success: true,
    user: {
      email: data.user?.email,
      id: data.user?.id,
    },
  })

  cookieAdapter.applyToResponse(response)

  return response
}
