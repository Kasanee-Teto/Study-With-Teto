export default function Sidebar() {
  return (
    <aside style={{ borderRight: "1px solid #222", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Teto</div>
      <button style={{ width: "100%", padding: 10, marginBottom: 12 }}>
        + New Chat
      </button>
      <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 8 }}>Chats</div>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 10, background: "#111" }}>Chat 1</div>
      </div>
    </aside>
  );
}