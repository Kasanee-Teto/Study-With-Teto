import { getJSON, patchJSON, postJSON } from '../lib/api'
import { generateReply } from './aiService'

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
  const data = await patchJSON('/api/chat/session', { sessionId, title })
  return data.session
}

export async function listMessages(sessionId, limit = 200) {
  const data = await getJSON('/api/chat/message', { sessionId, limit })
  return data.messages || []
}

export async function sendMessage(sessionId, content) {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Message cannot be empty')

  const { message: userMessage } = await postJSON('/api/chat/message', {
    sessionId,
    role: 'user',
    content: trimmed
  })

  const contextMessages = await listMessages(sessionId, CONTEXT_LIMIT)
  const promptMessages = contextMessages.map(({ role, content: body }) => ({ role, content: body }))

  try {
    const reply = await generateReply({ sessionId, messages: promptMessages })
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
