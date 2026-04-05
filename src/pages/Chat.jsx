import { useEffect, useMemo, useState } from 'react'
import { postJSON, callAI } from '../lib/api'

export default function Chat() {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

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

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)

    try {
      await postJSON('/api/chat/message', { sessionId, role: 'user', content: text })

      const reply = await callAI({ mode: 'chat', messages: next })
      const next2 = [...next, { role: 'assistant', content: reply }]
      setMessages(next2)

      await postJSON('/api/chat/message', { sessionId, role: 'assistant', content: reply })
    } catch (e) {
      console.error(e)
      alert(e.message || String(e))
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