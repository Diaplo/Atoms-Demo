import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { db } from '@/lib/db'
import { chats, messages, users } from '@/lib/db/schema'
import { deleteChat as deleteChatRecord } from '@/lib/db/queries/chats'
import { eq, and } from 'drizzle-orm'
import {
  createServerCookieMethods,
  logAuthCookieSnapshot,
} from '@/lib/supabase/cookies'
import { deriveChatTitle, isDefaultChatTitle } from '@/lib/utils/chat-title'

async function updateChatMetadata({
  chatId,
  chatTitle,
  role,
  content,
}: {
  chatId: string
  chatTitle: string
  role: string
  content: string
}) {
  const nextChatValues: { updatedAt: Date; title?: string } = {
    updatedAt: new Date(),
  }

  if (role === 'user' && isDefaultChatTitle(chatTitle)) {
    nextChatValues.title = deriveChatTitle(content)
  }

  await db
    .update(chats)
    .set(nextChatValues)
    .where(eq(chats.id, chatId))

  console.log('[API Chat Detail] Chat metadata updated', {
    chatId,
    titleUpdated: Boolean(nextChatValues.title),
  })
}

async function getUserFromCookie() {
  const cookieStore = await cookies()
  logAuthCookieSnapshot('[API Chat Detail] Incoming', cookieStore)
  
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
        '[API Chat Detail]'
      ),
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.log('API - Failed to get user from cookie')
    return null
  }
  
  return user
}

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

export async function GET(
  _request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const user = await getUserFromCookie()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await ensureUserInDatabase(user)

    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, params.chatId), eq(chats.userId, user.id)))

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, params.chatId))
      .orderBy(messages.createdAt)

    return NextResponse.json({
      ...chat,
      messages: chatMessages,
    })
  } catch (error) {
    console.error('Error fetching chat:', error)
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 })
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

    await ensureUserInDatabase(user)

    const { role, content } = await request.json()
    console.log('[API Chat Detail] POST message request', {
      chatId: params.chatId,
      role,
      contentLength: typeof content === 'string' ? content.length : 0,
    })

    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, params.chatId), eq(chats.userId, user.id)))

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const [newMessage] = await db.insert(messages).values({
      chatId: params.chatId,
      role,
      content,
    }).returning()
    console.log('[API Chat Detail] Message inserted', {
      chatId: params.chatId,
      messageId: newMessage.id,
      role: newMessage.role,
    })

    void updateChatMetadata({
      chatId: params.chatId,
      chatTitle: chat.title,
      role,
      content,
    }).catch(error => {
      console.error('[API Chat Detail] Failed to update chat metadata:', error)
    })

    return NextResponse.json(newMessage)
  } catch (error) {
    console.error('Error adding message:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const user = await getUserFromCookie()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await ensureUserInDatabase(user)

    const [chat] = await db
      .select({
        id: chats.id,
      })
      .from(chats)
      .where(and(eq(chats.id, params.chatId), eq(chats.userId, user.id)))

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    await deleteChatRecord(params.chatId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat:', error)
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 })
  }
}
