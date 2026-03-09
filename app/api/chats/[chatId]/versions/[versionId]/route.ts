import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import {
  deleteCodeVersion,
  getCodeVersion,
} from '@/lib/db/queries/code-versions'
import {
  createServerCookieMethods,
  logAuthCookieSnapshot,
} from '@/lib/supabase/cookies'

async function getUserFromCookie() {
  const cookieStore = await cookies()
  logAuthCookieSnapshot('[API Version Detail] Incoming', cookieStore)

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
        '[API Version Detail]'
      ),
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

async function assertChatOwnership(chatId: string, userId: string) {
  const [chat] = await db
    .select({
      id: chats.id,
    })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))

  return chat ?? null
}

export async function DELETE(
  _request: Request,
  { params }: { params: { chatId: string; versionId: string } }
) {
  try {
    const user = await getUserFromCookie()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const chat = await assertChatOwnership(params.chatId, user.id)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const version = await getCodeVersion(params.versionId)
    if (!version || version.chatId !== params.chatId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    await deleteCodeVersion(params.versionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API Version Detail] Error deleting version:', error)
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    )
  }
}
