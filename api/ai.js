import { requireUser } from './_lib/requireUser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key is not configured on the server' })
  }

  try {
    await requireUser(req)

    const { messages = [], mode = 'chat', model } = req.body || {}

    const effectiveModel = model || process.env.OPENROUTER_DEFAULT_MODEL
    if (!effectiveModel) {
      return res.status(500).json({ error: 'Model not configured' })
    }

    const system =
      mode === 'coach'
        ? "You are Kasane Teto, a friendly chess coach. Explain moves simply, give 1-3 actionable tips."
        : "You are Kasane Teto, a friendly study tutor. Be concise, helpful, and encouraging. Use Indonesian by default."

    const payload = {
      model: effectiveModel,
      messages: [{ role: 'system', content: system }, ...messages]
    }

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost',
        'X-Title': 'Study-With-Teto'
      },
      body: JSON.stringify(payload)
    })

    if (!r.ok) {
      return res.status(502).json({ error: 'AI service error' })
    }

    const data = await r.json()
    const text = data?.choices?.[0]?.message?.content || ''
    return res.status(200).json({ text })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}