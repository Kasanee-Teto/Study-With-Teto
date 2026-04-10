import { useEffect, useRef } from 'react'

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
        {!isUser && <span className="mb-1 inline-block text-xs font-semibold text-text-secondary">Teto</span>}
        <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{message.content}</p>
      </div>
    </div>
  )
}

export default function ChatMain({
  title,
  messages,
  input,
  onInputChange,
  onSend,
  busy,
  error,
  disabled,
  onOpenLeftDrawer,
  onOpenRightDrawer
}) {
  const listRef = useRef(null)

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, busy, error])

  return (
    <section className="flex h-full min-h-0 flex-col bg-bg-main overflow-hidden">
      <header className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button className="chat-icon-btn md:hidden" onClick={onOpenLeftDrawer}>☰</button>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="chat-subtle">Persistent memory enabled per session</p>
        </div>
        <button className="chat-icon-btn lg:hidden" onClick={onOpenRightDrawer}>⚙</button>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="chat-subtle">Start the conversation — previous messages will be reused as memory.</p>
        )}
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || `${message.role}-${message.created_at || 'temp'}-${index}`}
            message={message}
          />
        ))}
        {busy && <p className="chat-subtle">Teto is thinking...</p>}
      </div>

      {error && <div className="shrink-0 px-4 pb-2 text-sm text-red-300">⚠ {error}</div>}

       <footer className="shrink-0 border-t border-white/10 bg-bg-panel2 p-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSend()
              }
            }}
            className="chat-input flex-1"
            placeholder={disabled ? 'Sign in to send messages' : 'Ask Teto anything...'}
            disabled={disabled || busy}
          />
          <button className="chat-btn" onClick={onSend} disabled={disabled || busy || !input.trim()}>
            Send
          </button>
        </div>
      </footer>
    </section>
  )
}
