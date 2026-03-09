import { db } from '@/lib/db'
import { chats, messages, type Chat, type Message } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// Types for return values
export type ChatWithMessages = Chat & {
  messages: Message[]
}

// Create a new chat
export async function createChat(
  userId: string,
  projectId: string,
  title: string
): Promise<Chat> {
  try {
    const [chat] = await db.insert(chats).values({
      userId,
      projectId,
      title,
    }).returning()
    
    return chat
  } catch (error) {
    console.error('Error creating chat:', error)
    throw new Error('Failed to create chat')
  }
}

// Get a chat with all its messages
export async function getChat(chatId: string): Promise<ChatWithMessages | null> {
  try {
    const [chat] = await db.select().from(chats).where(eq(chats.id, chatId))
    
    if (!chat) {
      return null
    }
    
    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt)
    
    return {
      ...chat,
      messages: chatMessages,
    }
  } catch (error) {
    console.error('Error getting chat:', error)
    throw new Error('Failed to get chat')
  }
}

// Get all chats for a user
export async function getUserChats(userId: string): Promise<Chat[]> {
  try {
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt))
    
    return userChats
  } catch (error) {
    console.error('Error getting user chats:', error)
    throw new Error('Failed to get user chats')
  }
}

// Get all chats for a project
export async function getProjectChats(projectId: string): Promise<Chat[]> {
  try {
    const projectChats = await db
      .select()
      .from(chats)
      .where(eq(chats.projectId, projectId))
      .orderBy(desc(chats.updatedAt))
    
    return projectChats
  } catch (error) {
    console.error('Error getting project chats:', error)
    throw new Error('Failed to get project chats')
  }
}

// Update chat title
export async function updateChatTitle(chatId: string, title: string): Promise<Chat> {
  try {
    const [updatedChat] = await db
      .update(chats)
      .set({ 
        title,
        updatedAt: new Date() 
      })
      .where(eq(chats.id, chatId))
      .returning()
    
    if (!updatedChat) {
      throw new Error('Chat not found')
    }
    
    return updatedChat
  } catch (error) {
    console.error('Error updating chat title:', error)
    throw new Error('Failed to update chat title')
  }
}

// Delete a chat and all its messages (cascades automatically)
export async function deleteChat(chatId: string): Promise<void> {
  try {
    await db.delete(chats).where(eq(chats.id, chatId))
  } catch (error) {
    console.error('Error deleting chat:', error)
    throw new Error('Failed to delete chat')
  }
}

// Update chat's updatedAt timestamp (useful when adding messages)
export async function touchChat(chatId: string): Promise<void> {
  try {
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId))
  } catch (error) {
    console.error('Error touching chat:', error)
    throw new Error('Failed to update chat timestamp')
  }
}
