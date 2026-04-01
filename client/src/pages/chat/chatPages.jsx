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

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text }]);

    // sementara: reply dummy dulu
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: "assistant", text: "Oke, aku bantu." },
    ]);
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