import { streamText, convertToCoreMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import { SYSTEM_PROMPT } from '@/lib/prompts/system-prompt'

export const maxDuration = 300

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenAICompatibleChatRequest {
  messages: ChatMessage[]
  apiKey: string
  baseUrl: string
  model: string
}

function validateRequest(body: unknown): { valid: true; data: OpenAICompatibleChatRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' }
  }

  const { messages, apiKey, baseUrl, model } = body as Record<string, unknown>

  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: 'messages array is required and must not be empty' }
  }

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: 'Each message must be an object' }
    }
    const { role, content } = msg as Record<string, unknown>
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      return { valid: false, error: 'Message role must be "user", "assistant", or "system"' }
    }
    if (typeof content !== 'string') {
      return { valid: false, error: 'Message content must be a string' }
    }
  }

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { valid: false, error: 'apiKey is required and must be a non-empty string' }
  }

  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    return { valid: false, error: 'baseUrl is required' }
  }

  try {
    new URL(baseUrl)
  } catch {
    return { valid: false, error: 'Invalid baseUrl format' }
  }

  if (typeof model !== 'string' || model.trim() === '') {
    return { valid: false, error: 'model is required' }
  }

  return {
    valid: true,
    data: {
      messages: messages as ChatMessage[],
      apiKey: apiKey as string,
      baseUrl: baseUrl as string,
      model: model as string,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const validation = validateRequest(body)
    if (!validation.valid) {
      const errorResponse = validation as { valid: false; error: string }
      return new Response(
        JSON.stringify({ error: errorResponse.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { messages, apiKey, baseUrl, model } = validation.data

    console.log('[Chat API] Request:', { model, baseUrl, messageCount: messages.length })

    const provider = createOpenAI({ 
      apiKey, 
      baseURL: baseUrl,
      compatibility: 'strict'
    })

    const messagesWithSystem = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.filter(m => m.role !== 'system')
    ]

    console.log('[Chat API] Starting stream with model:', model)

    const result = await streamText({
      model: provider(model),
      messages: convertToCoreMessages(messagesWithSystem),
      onFinish: (event) => {
        console.log('[Chat API] Stream finished:', { 
          finishReason: event.finishReason,
          usage: event.usage
        })
      }
    })

    console.log('[Chat API] Stream created successfully')

    const response = result.toDataStreamResponse()
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return response
  } catch (error) {
    console.error('[Chat API] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key or authentication failed' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (error.message.includes('model') && error.message.includes('not exist')) {
        return new Response(
          JSON.stringify({ error: 'Model not found. Please check your model ID configuration.' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
