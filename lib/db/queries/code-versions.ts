import { db } from '@/lib/db'
import { codeVersions, type CodeVersion } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import type { StoredCodeFiles } from '@/lib/utils/code-files'
export type { StoredCodeFiles } from '@/lib/utils/code-files'

// Types for return values
export type CodeVersionWithFiles = CodeVersion

// Create a new code version
export async function createCodeVersion(
  chatId: string,
  messageId: string,
  files: StoredCodeFiles,
  version: number,
  isManual: boolean = false,
  description?: string,
  prompt?: string | null
): Promise<CodeVersion> {
  try {
    const [codeVersion] = await db.insert(codeVersions).values({
      chatId,
      messageId,
      files,
      version,
      isManual,
      description,
      prompt: prompt ?? null,
    }).returning()
    
    return codeVersion
  } catch (error) {
    console.error('Error creating code version:', error)
    throw new Error('Failed to create code version')
  }
}

// Get all code versions for a chat
export async function getCodeVersions(chatId: string): Promise<CodeVersion[]> {
  try {
    const versions = await db
      .select()
      .from(codeVersions)
      .where(eq(codeVersions.chatId, chatId))
      .orderBy(desc(codeVersions.version))
    
    return versions
  } catch (error) {
    console.error('Error getting code versions:', error)
    throw new Error('Failed to get code versions')
  }
}

// Get a specific code version by ID
export async function getCodeVersion(versionId: string): Promise<CodeVersion | null> {
  try {
    const [version] = await db
      .select()
      .from(codeVersions)
      .where(eq(codeVersions.id, versionId))
    
    return version || null
  } catch (error) {
    console.error('Error getting code version:', error)
    throw new Error('Failed to get code version')
  }
}

// Get the latest code version for a chat
export async function getLatestCodeVersion(chatId: string): Promise<CodeVersion | null> {
  try {
    const [latestVersion] = await db
      .select()
      .from(codeVersions)
      .where(eq(codeVersions.chatId, chatId))
      .orderBy(desc(codeVersions.version))
      .limit(1)
    
    return latestVersion || null
  } catch (error) {
    console.error('Error getting latest code version:', error)
    throw new Error('Failed to get latest code version')
  }
}

// Delete a code version
export async function deleteCodeVersion(versionId: string): Promise<void> {
  try {
    await db.delete(codeVersions).where(eq(codeVersions.id, versionId))
  } catch (error) {
    console.error('Error deleting code version:', error)
    throw new Error('Failed to delete code version')
  }
}

// Get next version number for a chat
export async function getNextVersionNumber(chatId: string): Promise<number> {
  try {
    const latest = await getLatestCodeVersion(chatId)
    return latest ? latest.version + 1 : 1
  } catch (error) {
    console.error('Error getting next version number:', error)
    throw new Error('Failed to get next version number')
  }
}

// Get code versions by message ID
export async function getCodeVersionsByMessage(messageId: string): Promise<CodeVersion[]> {
  try {
    const versions = await db
      .select()
      .from(codeVersions)
      .where(eq(codeVersions.messageId, messageId))
      .orderBy(desc(codeVersions.version))
    
    return versions
  } catch (error) {
    console.error('Error getting code versions by message:', error)
    throw new Error('Failed to get code versions by message')
  }
}

// Get only manual saves (user-saved versions)
export async function getManualCodeVersions(chatId: string): Promise<CodeVersion[]> {
  try {
    const versions = await db
      .select()
      .from(codeVersions)
      .where(and(
        eq(codeVersions.chatId, chatId),
        eq(codeVersions.isManual, true)
      ))
      .orderBy(desc(codeVersions.version))
    
    return versions
  } catch (error) {
    console.error('Error getting manual code versions:', error)
    throw new Error('Failed to get manual code versions')
  }
}

// Count code versions for a chat
export async function countCodeVersions(chatId: string): Promise<number> {
  try {
    const result = await db
      .select()
      .from(codeVersions)
      .where(eq(codeVersions.chatId, chatId))
    
    return result.length
  } catch (error) {
    console.error('Error counting code versions:', error)
    throw new Error('Failed to count code versions')
  }
}

// Create a code version with auto-incremented version number
export async function createCodeVersionAuto(
  chatId: string,
  messageId: string,
  files: StoredCodeFiles,
  isManual: boolean = false,
  description?: string,
  prompt?: string | null
): Promise<CodeVersion> {
  const version = await getNextVersionNumber(chatId)
  return createCodeVersion(
    chatId,
    messageId,
    files,
    version,
    isManual,
    description,
    prompt
  )
}
