import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chats, messages } from '@/lib/db/schema'
import {
  createCodeVersionAuto,
  getCodeVersions,
} from '@/lib/db/queries/code-versions'
import {
  createServerCookieMethods,
  logAuthCookieSnapshot,
} from '@/lib/supabase/cookies'
import type { StoredCodeFiles } from '@/lib/utils/code-files'

async function getUserFromCookie() {
  const cookieStore = await cookies()
  logAuthCookieSnapshot('[API Versions] Incoming', cookieStore)

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
        '[API Versions]'
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

async function resolveMessageId(chatId: string, requestedMessageId?: string) {
  if (requestedMessageId) {
    const [message] = await db
      .select({
        id: messages.id,
      })
      .from(messages)
      .where(
        and(eq(messages.id, requestedMessageId), eq(messages.chatId, chatId))
      )

    return message?.id ?? null
  }

  const [latestMessage] = await db
    .select({
      id: messages.id,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt))
    .limit(1)

  return latestMessage?.id ?? null
}

export async function GET(
  _request: Request,
  { params }: { params: { chatId: string } }
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

    const versions = await getCodeVersions(params.chatId)
    return NextResponse.json(versions)
  } catch (error) {
    console.error('[API Versions] Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
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

    const body = await request.json()
    const {
      files,
      messageId,
      prompt,
      isManual = false,
      description,
    } = body as {
      files?: StoredCodeFiles
      messageId?: string
      prompt?: string | null
      isManual?: boolean
      description?: string
    }

    if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: 'files are required' },
        { status: 400 }
      )
    }

    const resolvedMessageId = await resolveMessageId(params.chatId, messageId)

    if (!resolvedMessageId) {
      return NextResponse.json(
        { error: 'No message available to associate with this version' },
        { status: 400 }
      )
    }

    const version = await createCodeVersionAuto(
      params.chatId,
      resolvedMessageId,
      files,
      isManual,
      description,
      prompt
    )

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('[API Versions] Error creating version:', error)
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    )
  }
}
