import { useEffect, useMemo, useState } from 'react'
import { postJSON, callAI } from '../lib/api'

export default function Chat() {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState(null)

  const canSend = useMemo(() => input.trim().length > 0 && !busy && sessionId, [input, busy, sessionId])

  useEffect(() => {
    async function init() {
      // ensure app_user exists
      await postJSON('/api/user/upsert')

      // create session
      const { session } = await postJSON('/api/chat/session', { title: 'Chat with Teto' })
      setSessionId(session.id)
    }
    init().catch(err => {
      console.error(err)
      alert(err.message || String(err))
    })
  }, [])

  async function send() {
    if (!canSend) return
    const text = input.trim()
    setInput('')
    setBusy(true)
    setSendError(null)

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)

    try {
      await postJSON('/api/chat/message', { sessionId, role: 'user', content: text })

      const reply = await callAI({ mode: 'chat', messages: next })
      const next2 = [...next, { role: 'assistant', content: reply }]
      setMessages(next2)

      await postJSON('/api/chat/message', { sessionId, role: 'assistant', content: reply })
    } catch (e) {
      console.error(e)
      // Revert the optimistic user message so chat state stays consistent
      setMessages(messages)
      setInput(text)

      // Surface a specific, actionable error message
      let errorMessage = e.message || 'Failed to send message'
      if (e.status === 401) {
        errorMessage = 'Session expired or unauthorized. Please sign in again.'
      } else if (e.status === 429) {
        errorMessage = 'AI rate limit reached. Please wait a moment and try again.'
      } else if (e.status === 400) {
        errorMessage = `AI configuration error: ${e.detail || 'check model name'}.`
      } else if (e.status === 500 && e.message?.includes('misconfigured')) {
        errorMessage = 'AI service is not configured on the server. Contact the administrator.'
      }
      setSendError(errorMessage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h2>Chat with Teto</h2>

      {!sessionId && <div>Preparing session...</div>}

      <div style={{ border: '1px solid #ddd', padding: 12, minHeight: 300, marginTop: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
        {busy && <div><i>Teto is thinking...</i></div>}
      </div>

      {sendError && (
        <div style={{ marginTop: 8, color: '#c00', fontSize: 14 }}>
          ⚠️ {sendError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder="Ask Teto..."
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={send} disabled={!canSend}>
          Send
        </button>
      </div>
    </div>
  )
}