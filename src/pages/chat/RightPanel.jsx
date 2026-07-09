import { useState } from 'react'

function SessionTitleEditor({ activeSession, onRenameSession, renamingSession }) {
  const [titleDraft, setTitleDraft] = useState(activeSession?.title || 'New chat')
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!activeSession?.id || renamingSession) return

    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      setError('Title is required')
      return
    }

    if (nextTitle === activeSession.title) {
      setError(null)
      return
    }

    try {
      setError(null)
      await onRenameSession(activeSession.id, nextTitle)
    } catch (renameError) {
      console.error(renameError)
      setError(renameError.message || 'Failed to rename session')
    }
  }

  return (
    <form className="mt-2 space-y-2" onSubmit={handleSubmit}>
      <input
        className="chat-input w-full"
        value={titleDraft}
        onChange={(event) => setTitleDraft(event.target.value)}
        maxLength={120}
        disabled={!activeSession || renamingSession}
        placeholder="Session title"
      />

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button
        className="chat-btn w-full"
        type="submit"
        disabled={
          !activeSession ||
          renamingSession ||
          !titleDraft.trim() ||
          titleDraft.trim() === activeSession.title
        }
      >
        {renamingSession ? 'Saving...' : 'Save title'}
      </button>
    </form>
  )
}

export default function RightPanel({
  activeSession,
  messageCount,
  onRenameSession,
  renamingSession
}) {
  return (
    <aside className="chat-panel border-l border-white/10 bg-bg-panel2 p-5">
      <h3 className="text-lg font-semibold text-text-primary">Character Details</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Teto keeps context from this session only. Start a new chat to reset memory.
      </p>

      <div className="mt-6 space-y-3">
        <div className="chat-meta-item">
          <span className="chat-subtle">Session title</span>
          <SessionTitleEditor
            key={`${activeSession?.id || 'empty'}:${activeSession?.title || ''}`}
            activeSession={activeSession}
            onRenameSession={onRenameSession}
            renamingSession={renamingSession}
          />
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
