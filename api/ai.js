import { requireUser } from './_lib/requireUser.js'
import { buildTetoSystem } from './_lib/persona.js'

async function postJson(url, { headers, body }) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

  // upstream kadang balas non-JSON (HTML/text), jadi amanin:
  const raw = await r.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { raw }
  }

  return { ok: r.ok, status: r.status, data }
}

function getUpstreamMessage(data) {
  return data?.error?.message || data?.error || data?.message || data?.raw || null
}

function createProviderError({ provider, status, error, detail }) {
  const e = new Error(error)
  e.provider = provider
  e.status = status
  e.detail = detail
  return e
}

function statusToClientError(status) {
  if (status === 401 || status === 403) return 'AI upstream unauthorized — check API key'
  if (status === 429) return 'AI rate limit or quota exceeded. Try again later.'
  if (status === 400) return 'Bad request to AI upstream — check model name or payload'
  return 'AI upstream error'
}

async function callOpenRouter({ messages, model, systemPrompt, requestId, ts }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const effectiveModel = model || process.env.OPENROUTER_DEFAULT_MODEL

  if (!apiKey) {
    throw createProviderError({
      provider: 'openrouter',
      status: 500,
      error: 'AI service misconfigured',
      detail: 'OPENROUTER_API_KEY is not set on the server',
    })
  }

  if (!effectiveModel) {
    throw createProviderError({
      provider: 'openrouter',
      status: 500,
      error: 'AI service misconfigured',
      detail: 'No model configured. Set OPENROUTER_DEFAULT_MODEL or pass model in request.',
    })
  }

  console.log(
    `[ai][${requestId}][${ts}] request provider=openrouter model=${effectiveModel} messages=${messages.length}`
  )

  const body = {
    model: effectiveModel,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 500,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  }

  const { ok, status, data } = await postJson('https://openrouter.ai/api/v1/chat/completions', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost',
      'X-Title': 'Study-With-Teto',
    },
    body,
  })

  if (!ok) {
    const detail = getUpstreamMessage(data)
    throw createProviderError({
      provider: 'openrouter',
      status,
      error: statusToClientError(status),
      detail,
    })
  }

  const text = data?.choices?.[0]?.message?.content || ''
  console.log(`[ai][${requestId}][${ts}] success provider=openrouter replyLen=${text.length}`)

  return { text, provider: 'openrouter', model: effectiveModel }
}

async function callGroq({ messages, systemPrompt, requestId, ts }) {
  const apiKey = process.env.GROQ_API_KEY
  const effectiveModel = process.env.GROQ_DEFAULT_MODEL

  if (!apiKey || !effectiveModel) {
    throw createProviderError({
      provider: 'groq',
      status: 500,
      error: 'AI fallback unavailable',
      detail: 'GROQ_API_KEY or GROQ_DEFAULT_MODEL is not configured',
    })
  }

  console.log(`[ai][${requestId}][${ts}] request provider=groq model=${effectiveModel} messages=${messages.length}`)

  const body = {
    model: effectiveModel,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 500,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  }

  const { ok, status, data } = await postJson('https://api.groq.com/openai/v1/chat/completions', {
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  })

  if (!ok) {
    const detail = getUpstreamMessage(data)
    throw createProviderError({
      provider: 'groq',
      status,
      error: statusToClientError(status),
      detail,
    })
  }

  const text = data?.choices?.[0]?.message?.content || ''
  console.log(`[ai][${requestId}][${ts}] success provider=groq replyLen=${text.length}`)

  return { text, provider: 'groq', model: effectiveModel }
}

function chooseHttpStatus(failures) {
  const statuses = failures.map((f) => f.status).filter(Boolean)
  if (statuses.some((s) => s === 401 || s === 403)) return 401
  if (statuses.includes(429)) return 429
  if (statuses.includes(400)) return 400
  if (statuses.every((s) => s >= 500 && s < 600)) return 502
  return statuses[0] || 502
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const requestId = globalThis.crypto?.randomUUID?.() || String(Date.now())
  const ts = new Date().toISOString()

  try {
    await requireUser(req)

    const body = req.body || {}
    const messages = Array.isArray(body.messages) ? body.messages : []
    const mode = body.mode || 'chat'
    const model = body.model

    // Persona prompt (ID/EN auto via messages)
    const systemPrompt = buildTetoSystem(mode, messages)

    try {
      const result = await callOpenRouter({ messages, model, systemPrompt, requestId, ts })
      return res.status(200).json({ text: result.text, provider: result.provider, requestId })
    } catch (openrouterError) {
      console.error(
        `[ai][${requestId}][${ts}] provider=openrouter failed status=${openrouterError.status || 'unknown'}`,
        openrouterError.detail || openrouterError.message
      )

      try {
        const fallback = await callGroq({ messages, systemPrompt, requestId, ts })
        return res.status(200).json({
          text: fallback.text,
          provider: fallback.provider,
          fallbackFrom: 'openrouter',
          requestId,
        })
      } catch (groqError) {
        console.error(
          `[ai][${requestId}][${ts}] provider=groq failed status=${groqError.status || 'unknown'}`,
          groqError.detail || groqError.message
        )

        const failures = [openrouterError, groqError].map((e) => ({
          provider: e.provider || 'unknown',
          status: e.status || null,
          error: e.message || 'Provider failed',
          detail: e.detail || null,
        }))

        const status = chooseHttpStatus(failures)
        return res.status(status).json({
          error: statusToClientError(status),
          detail: 'All configured AI providers failed',
          upstreamStatus: failures[0]?.status || null,
          requestId,
          failures,
        })
      }
    }
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized', requestId })
    }

    console.error(`[ai][${requestId}][${ts}] unhandled error:`, e)
    return res.status(500).json({ error: 'Server error', requestId, detail: String(e?.message || e) })
  }
}