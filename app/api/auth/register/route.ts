import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerCookieMethods } from '@/lib/supabase/cookies'

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()

  const cookieAdapter = createRouteHandlerCookieMethods(
    cookieStore,
    '[API Register]'
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieAdapter.cookies,
    }
  )

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    console.error('[API Register] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const response = NextResponse.json({
    success: true,
    user: {
      email: data.user?.email,
      id: data.user?.id,
    },
    session: data.session,
    needsEmailConfirmation: data.user && !data.session,
  })

  cookieAdapter.applyToResponse(response)

  return response
}
