import { requireUser } from './_lib/requireUser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const requestId = crypto.randomUUID()
  const ts = new Date().toISOString()

  try {
    await requireUser(req)

    // Validate required server env vars up front
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error(`[ai][${requestId}][${ts}] OPENROUTER_API_KEY is not set`)
      return res.status(500).json({
        error: 'AI service misconfigured',
        detail: 'OPENROUTER_API_KEY is not set on the server',
        requestId
      })
    }

    const { messages = [], mode = 'chat', model } = req.body || {}

    const effectiveModel = model || process.env.OPENROUTER_DEFAULT_MODEL
    if (!effectiveModel) {
      console.error(`[ai][${requestId}][${ts}] No model configured (OPENROUTER_DEFAULT_MODEL missing and none in request)`)
      return res.status(500).json({
        error: 'AI service misconfigured',
        detail: 'No model configured. Set OPENROUTER_DEFAULT_MODEL env var or pass model in request.',
        requestId
      })
    }

    console.log(`[ai][${requestId}][${ts}] request mode=${mode} model=${effectiveModel} messages=${messages.length}`)

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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost',
        'X-Title': 'Study-With-Teto'
      },
      body: JSON.stringify(payload)
    })

    if (!r.ok) {
      let upstreamBody = null
      let upstreamMessage = null
      try {
        upstreamBody = await r.json()
        upstreamMessage = upstreamBody?.error?.message || upstreamBody?.error || null
      } catch {
        // upstream returned non-JSON; leave upstreamBody null
      }

      console.error(
        `[ai][${requestId}][${ts}] upstream error status=${r.status} model=${effectiveModel}`,
        upstreamMessage || '(no message)'
      )

      // Pass through 401/403 from OpenRouter as 401 to client
      if (r.status === 401 || r.status === 403) {
        return res.status(401).json({
          error: 'AI upstream unauthorized — check OPENROUTER_API_KEY',
          upstreamStatus: r.status,
          requestId
        })
      }

      // 429 rate-limit / quota
      if (r.status === 429) {
        return res.status(429).json({
          error: 'AI rate limit or quota exceeded. Try again later.',
          upstreamStatus: r.status,
          requestId
        })
      }

      // 400 bad request (e.g. unknown model)
      if (r.status === 400) {
        return res.status(400).json({
          error: 'Bad request to AI upstream — check model name or payload',
          detail: upstreamMessage,
          upstreamStatus: r.status,
          requestId
        })
      }

      // All other upstream errors → 502 with details
      return res.status(502).json({
        error: 'AI upstream error',
        detail: upstreamMessage,
        upstreamStatus: r.status,
        requestId
      })
    }

    const data = await r.json()
    const text = data?.choices?.[0]?.message?.content || ''
    console.log(`[ai][${requestId}][${ts}] success model=${effectiveModel} replyLen=${text.length}`)
    return res.status(200).json({ text, requestId })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized', requestId })
    }
    console.error(`[ai][${requestId}][${ts}] unhandled error:`, e.message)
    return res.status(500).json({ error: 'Server error', requestId })
  }
}