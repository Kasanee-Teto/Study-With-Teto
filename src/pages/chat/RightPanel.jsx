export default function RightPanel({ activeSession, messageCount }) {
  return (
    <aside className="chat-panel border-l border-white/10 bg-bg-panel2 p-5">
      <h3 className="text-lg font-semibold text-text-primary">Character Details</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Teto keeps context from this session only. Start a new chat to reset memory.
      </p>

      <div className="mt-6 space-y-3">
        <div className="chat-meta-item">
          <span className="chat-subtle">Session title</span>
          <p className="text-sm text-text-primary">{activeSession?.title || 'New chat'}</p>
        </div>
        <div className="chat-meta-item">
          <span className="chat-subtle">Messages</span>
          <p className="text-sm text-text-primary">{messageCount}</p>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <button className="chat-btn w-full" disabled>
          Streaming (coming soon)
        </button>
        <button className="chat-btn w-full" disabled>
          Session summary (coming soon)
        </button>
      </div>
    </aside>
  )
}
