import { useState } from "react";
import Sidebar from "../../components/sidebar";
import ChatArea from "../../components/chatarea";
import Composer from "../../components/composer";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Halo, aku Teto. Mau mulai dari mana?" },
  ]);

  async function handleSend(text) {
  if (!text.trim()) return;

  // 1) tambah pesan user ke UI
  const userMsg = { id: Date.now(), role: "user", text };
  setMessages((prev) => [...prev, userMsg]);

  try {
    // 2) panggil backend
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    // 3) tambah balasan AI ke UI
    const assistantMsg = {
      id: Date.now() + 1,
      role: "assistant",
      text: data.reply,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  } catch (err) {
  console.error(err);
  setMessages((prev) => [
    ...prev,
    { id: Date.now() + 2, role: "assistant", text: "Gagal memanggil server." },
  ]);
}
}
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "100vh" }}>
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <ChatArea messages={messages} />
        <Composer onSend={handleSend} />
      </div>
    </div>
  );
}