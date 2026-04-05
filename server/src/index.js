import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();
console.log("GROQ_API_KEY loaded?", !!process.env.GROQ_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten bernama Teto. Jawab singkat, jelas, dan ramah dalam bahasa Indonesia.",
        },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    console.error("Groq error:", err?.message || err);
    res.status(500).json({ error: "Failed to call Groq", detail: err?.message || String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));