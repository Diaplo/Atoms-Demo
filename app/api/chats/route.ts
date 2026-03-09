import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { db } from '@/lib/db'
import { chats, messages, projects, users, type NewChat } from '@/lib/db/schema'
import { desc, eq, inArray } from 'drizzle-orm'
import {
  createServerCookieMethods,
  logAuthCookieSnapshot,
} from '@/lib/supabase/cookies'
import {
  DEFAULT_CHAT_TITLE,
  deriveChatPreview,
  deriveChatTitle,
  isDefaultChatTitle,
} from '@/lib/utils/chat-title'

async function getUserFromCookie() {
  const cookieStore = await cookies()
  logAuthCookieSnapshot('[API Chats] Incoming', cookieStore)
  
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
        '[API Chats]'
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

export async function GET() {
  try {
    const user = await getUserFromCookie()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await ensureUserInDatabase(user)

    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, user.id))
      .orderBy(desc(chats.updatedAt))

    const chatIds = userChats.map(chat => chat.id)

    const chatMessages =
      chatIds.length > 0
        ? await db
            .select({
              chatId: messages.chatId,
              role: messages.role,
              content: messages.content,
              createdAt: messages.createdAt,
            })
            .from(messages)
            .where(inArray(messages.chatId, chatIds))
            .orderBy(messages.createdAt)
        : []

    const messagesByChat = new Map<
      string,
      Array<{
        role: string
        content: string
        createdAt: Date
      }>
    >()

    chatMessages.forEach(message => {
      const existingMessages = messagesByChat.get(message.chatId) ?? []
      existingMessages.push({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })
      messagesByChat.set(message.chatId, existingMessages)
    })

    const chatsWithMeta = userChats.map(chat => {
      const relatedMessages = messagesByChat.get(chat.id) ?? []
      const firstUserMessage = relatedMessages.find(
        message => message.role === 'user' && message.content.trim().length > 0
      )
      const latestMessage = [...relatedMessages]
        .reverse()
        .find(message => message.content.trim().length > 0)

      return {
        ...chat,
        title:
          isDefaultChatTitle(chat.title) && firstUserMessage
            ? deriveChatTitle(firstUserMessage.content)
            : chat.title || DEFAULT_CHAT_TITLE,
        preview: deriveChatPreview(latestMessage?.content),
      }
    })

    return NextResponse.json(chatsWithMeta)
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromCookie()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await ensureUserInDatabase(user)

    const { title = DEFAULT_CHAT_TITLE } = await request.json()

    let userProjects = await db.select().from(projects).where(eq(projects.userId, user.id))

    let projectId: string

    if (userProjects.length === 0) {
      const [newProject] = await db.insert(projects).values({
        userId: user.id,
        name: 'Default Project',
      }).returning()
      projectId = newProject.id
    } else {
      projectId = userProjects[0].id
    }

    const [newChat] = await db.insert(chats).values({
      userId: user.id,
      projectId,
      title,
    } as NewChat).returning()

    return NextResponse.json(newChat)
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}
