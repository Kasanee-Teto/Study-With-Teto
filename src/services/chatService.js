import { getJSON, patchJSON, postJSON } from '../lib/api'
import { generateReply } from './aiService'
import { supabase } from '../lib/supabaseClient'

const CONTEXT_LIMIT = 40

export async function listSessions() {
  const data = await getJSON('/api/chat/session', { limit: 100 })
  return data.sessions || []
}

export async function createSession(title = 'New chat') {
  const data = await postJSON('/api/chat/session', { title })
  return data.session
}

export async function updateSessionTitle(sessionId, title) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)

  const accessToken = sessionData?.session?.access_token
  if (!accessToken) throw new Error('Unauthorized')

  const response = await fetch(`/api/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ title })
  })

  const raw = await response.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { raw }
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to update session title')
  }

  return data
}

export async function listMessages(sessionId, limit = 200) {
  const data = await getJSON('/api/chat/message', { sessionId, limit })
  return data.messages || []
}

export async function sendMessage(sessionId, content, currentMessages = []) {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Message cannot be empty')

  const { message: userMessage } = await postJSON('/api/chat/message', {
    sessionId,
    role: 'user',
    content: trimmed
  })

  const fromState = Array.isArray(currentMessages)
    ? currentMessages.map(({ role, content: body }) => ({ role, content: body }))
    : []
  const promptMessages = [...fromState]
  const lastMessage = promptMessages[promptMessages.length - 1]
  if (!(lastMessage?.role === 'user' && lastMessage?.content === userMessage.content)) {
    promptMessages.push({ role: 'user', content: userMessage.content })
  }
  const trimmedPromptMessages = promptMessages.slice(-CONTEXT_LIMIT)

  try {
    const reply = await generateReply({ sessionId, messages: trimmedPromptMessages })
    const { message: assistantMessage } = await postJSON('/api/chat/message', {
      sessionId,
      role: 'assistant',
      content: reply
    })
    return { userMessage, assistantMessage }
  } catch (error) {
    error.userMessage = userMessage
    throw error
  }
}

