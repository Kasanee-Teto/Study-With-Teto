import { callAI } from '../lib/api'

export async function generateReply({ sessionId, messages, mode = 'chat' }) {
  return callAI({ mode, messages, sessionId })
}
