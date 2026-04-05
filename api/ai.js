export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { messages = [], mode = 'chat', model } = req.body || {}

    const system =
      mode === 'coach'
        ? "You are Kasane Teto, a friendly chess coach. Explain moves simply, give 1-3 actionable tips."
        : "You are Kasane Teto, a friendly study tutor. Be concise, helpful, and encouraging. Use Indonesian by default."

    const payload = {
      model: model || process.env.OPENROUTER_DEFAULT_MODEL,
      messages: [{ role: 'system', content: system }, ...messages]
    }

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // optional but recommended by OpenRouter:
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost',
        'X-Title': 'Study-With-Teto'
      },
      body: JSON.stringify(payload)
    })

    if (!r.ok) {
      const errText = await r.text()
      return res.status(500).json({ error: 'OpenRouter error', details: errText })
    }

    const data = await r.json()
    const text = data?.choices?.[0]?.message?.content || ''
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: 'Server error', details: String(e) })
  }
}