export default function ChatArea({ messages }) {
  return (
    <main style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 12 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 12px",
                borderRadius: 14,
                background: m.role === "user" ? "#2b2b2b" : "#141414",
                border: "1px solid #222",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}