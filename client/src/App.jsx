import ChatPage from "./pages/chat/chatPages";
import { useEffect, useState } from "react";

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="min-h-full">
      <button
        className="fixed right-4 top-4 z-50 rounded-xl border border-border bg-panel/80 px-3 py-2 text-sm backdrop-blur hover:bg-panel"
        onClick={() => setDark((v) => !v)}
      >
        {dark ? "Light" : "Dark"}
      </button>

      <ChatPage />
    </div>
  );
}