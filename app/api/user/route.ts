import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createServerCookieMethods } from '@/lib/supabase/cookies'

export const dynamic = 'force-dynamic'

async function ensureUserInDatabase(supabaseUser: any) {
  try {
    const existingUser = await db.select().from(users).where(eq(users.id, supabaseUser.id))
    
    if (existingUser.length === 0) {
      try {
        await db.insert(users).values({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
        })
      } catch (insertError: any) {
        if (insertError.code !== '23505') {
          throw insertError
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring user in database:', error)
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createServerCookieMethods(
          {
            get: name => cookieStore.get(name),
            getAll: () => cookieStore.getAll(),
            set: (name, value, options) => cookieStore.set(name, value, options),
          },
          '[API User]'
        ),
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await ensureUserInDatabase(user)

    let dbUserResult = await db.select().from(users).where(eq(users.id, user.id))

    let fullName = user.user_metadata?.full_name || user.email?.split('@')[0]
    let avatarUrl = user.user_metadata?.avatar_url

    if (dbUserResult.length > 0) {
      fullName = dbUserResult[0].fullName || fullName
      avatarUrl = dbUserResult[0].avatarUrl || avatarUrl
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName,
      avatarUrl,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
