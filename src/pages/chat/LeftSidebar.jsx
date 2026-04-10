export default function LeftSidebar({
  sessions,
  activeSessionId,
  search,
  setSearch,
  onCreateSession,
  onSelectSession,
  profileName,
  loading
}) {
  const filtered = sessions.filter((session) =>
    (session.title || 'New chat').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside className="chat-panel border-r border-white/10 bg-bg-panel">
      <div className="border-b border-white/10 p-1">
        <button className="chat-btn w-full" onClick={onCreateSession}>
          + New chat
        </button>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="chat-input mt-3 w-full"
          placeholder="Search chats..."
        />
      </div>

      <div className="h-[calc(100svh-170px)] overflow-y-auto p-3">
        {loading && <p className="chat-subtle px-2 py-1">Loading sessions...</p>}
        {!loading && filtered.length === 0 && <p className="chat-subtle px-2 py-1">No chats yet.</p>}
        <ul className="space-y-2">
          {filtered.map((session) => {
            const active = session.id === activeSessionId
            return (
              <li key={session.id}>
                <button
                  className={`chat-session-item ${active ? 'chat-session-item-active' : ''}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className="truncate">{session.title || 'New chat'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-white/10 p-4">
        <p className="chat-subtle">Signed in as</p>
        <p className="truncate text-sm font-medium text-text-primary">{profileName}</p>
      </div>
    </aside>
  )
}
