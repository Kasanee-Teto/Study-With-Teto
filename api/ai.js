import { requireUser } from './_lib/requireUser.js'

function buildSystem(mode) {
  return mode === 'coach'
    ? "You are Kasane Teto, a friendly chess coach. Explain moves simply, give 1-3 actionable tips."
    : "You are Kasane Teto, a friendly study tutor. Be concise, helpful, and encouraging. Use Indonesian by default."
}

async function postJson(url, { headers, body }) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

async function callOpenRouter({ messages, mode, model }) {
  const effectiveModel = model || process.env.OPENROUTER_DEFAULT_MODEL
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is missing')
  if (!effectiveModel) throw new Error('OPENROUTER_DEFAULT_MODEL not configured')

  const body = {
    model: effectiveModel,
    messages: [{ role: 'system', content: buildSystem(mode) }, ...messages],
  }

  const { ok, status, data } = await postJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost',
        'X-Title': 'Study-With-Teto',
      },
      body,
    }
  )

  if (!ok) {
    const e = new Error('OpenRouter request failed')
    e.provider = 'openrouter'
    e.status = status
    e.details = data
    throw e
  }

  return data?.choices?.[0]?.message?.content || ''
}

async function callGroq({ messages, mode }) {
  // fallback pakai default model saja (lebih aman)
  const effectiveModel = process.env.GROQ_DEFAULT_MODEL
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is missing')
  if (!effectiveModel) throw new Error('GROQ_DEFAULT_MODEL not configured')

  const body = {
    model: effectiveModel,
    messages: [{ role: 'system', content: buildSystem(mode) }, ...messages],
  }

  const { ok, status, data } = await postJson(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body,
    }
  )

  if (!ok) {
    const e = new Error('Groq request failed')
    e.provider = 'groq'
    e.status = status
    e.details = data
    throw e
  }

  return data?.choices?.[0]?.message?.content || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await requireUser(req)

    const { messages = [], mode = 'chat', model } = req.body || {}

    try {
      const text = await callOpenRouter({ messages, mode, model })
      return res.status(200).json({ text, provider: 'openrouter' })
    } catch (e1) {
      try {
        const text = await callGroq({ messages, mode })
        return res.status(200).json({ text, provider: 'groq', fallbackFrom: 'openrouter' })
      } catch (e2) {
        return res.status(502).json({
          error: 'AI service error',
          providersTried: [
            { provider: e1.provider || 'openrouter', status: e1.status, details: e1.details },
            { provider: e2.provider || 'groq', status: e2.status, details: e2.details },
          ],
        })
      }
    }
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}