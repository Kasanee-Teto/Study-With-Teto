import { useState } from "react";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    onSend(text);
    setText("");
  }

  return (
    <form onSubmit={submit} style={{ padding: 16, borderTop: "1px solid #222" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Teto..."
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 999,
            border: "1px solid #222",
            background: "#111",
            color: "white",
          }}
        />
        <button style={{ padding: "0 16px", borderRadius: 999 }}>Send</button>
      </div>
    </form>
  );
}