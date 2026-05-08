/**
 * api/ai.js — AI generation endpoint
 *
 * Provider fallback order:
 *   1. OpenRouter  model: tencent/hy3-preview:free   (high quality, free tier)
 *   2. OpenRouter  model: OPENROUTER_DEFAULT_MODEL    (your usual free model)
 *   3. Groq                                           (reliable fallback)
 *
 * Each OpenRouter attempt is tried in sequence; failures are collected and
 * reported only if ALL providers fail.
 */

import { requireUser }    from './_lib/requireUser.js'
import { buildTetoSystem } from './_lib/persona.js'

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function postJson(url, { headers, body }) {
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  })

  const raw = await r.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { raw }
  }

  return { ok: r.ok, status: r.status, data }
}

// ---------------------------------------------------------------------------
// Error builders
// ---------------------------------------------------------------------------

function getUpstreamMessage(data) {
  return data?.error?.message || data?.error || data?.message || data?.raw || null
}

function createProviderError({ provider, model, status, error, detail }) {
  const e    = new Error(error)
  e.provider = provider
  e.model    = model
  e.status   = status
  e.detail   = detail
  return e
}

function statusToClientError(status) {
  if (status === 401 || status === 403) return 'AI upstream unauthorized — check API key'
  if (status === 429)                   return 'AI rate limit or quota exceeded. Try again later.'
  if (status === 400)                   return 'Bad request to AI upstream — check model name or payload'
  return 'AI upstream error'
}

// ---------------------------------------------------------------------------
// OpenRouter — single model attempt
// ---------------------------------------------------------------------------

async function callOpenRouterModel({ model, messages, systemPrompt, requestId, ts }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw createProviderError({
      provider: 'openrouter', model,
      status: 500,
      error:  'AI service misconfigured',
      detail: 'OPENROUTER_API_KEY is not set on the server',
    })
  }

  console.log(
    `[ai][${requestId}][${ts}] attempt provider=openrouter model=${model} msgs=${messages.length}`
  )

  const body = {
    model,
    temperature: 0.3,
    top_p:       0.9,
    max_tokens:  500,
    messages:    [{ role: 'system', content: systemPrompt }, ...messages],
  }

  const { ok, status, data } = await postJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'http://localhost',
        'X-Title':      'Study-With-Teto',
      },
      body,
    }
  )

  if (!ok) {
    const detail = getUpstreamMessage(data)
    throw createProviderError({
      provider: 'openrouter', model,
      status,
      error:  statusToClientError(status),
      detail,
    })
  }

  const text = data?.choices?.[0]?.message?.content || ''
  console.log(
    `[ai][${requestId}][${ts}] success provider=openrouter model=${model} len=${text.length}`
  )

  return { text, provider: 'openrouter', model }
}

// ---------------------------------------------------------------------------
// OpenRouter — cascades through a list of candidate models
// ---------------------------------------------------------------------------

async function callOpenRouterWithFallback({ models, messages, systemPrompt, requestId, ts }) {
  const failures = []

  for (const model of models) {
    try {
      return await callOpenRouterModel({ model, messages, systemPrompt, requestId, ts })
    } catch (err) {
      console.warn(
        `[ai][${requestId}][${ts}] provider=openrouter model=${model} failed status=${err.status || 'unknown'}`,
        err.detail || err.message
      )
      failures.push({
        provider: 'openrouter',
        model,
        status:   err.status   || null,
        error:    err.message  || 'Provider failed',
        detail:   err.detail   || null,
      })

      // 401/403 → credentials broken; pointless to try more OpenRouter models
      if (err.status === 401 || err.status === 403) break
    }
  }

  const aggErr = new Error('All OpenRouter models failed')
  aggErr.failures = failures
  throw aggErr
}

// ---------------------------------------------------------------------------
// Groq fallback
// ---------------------------------------------------------------------------

async function callGroq({ messages, systemPrompt, requestId, ts }) {
  const apiKey       = process.env.GROQ_API_KEY
  const effectiveModel = process.env.GROQ_DEFAULT_MODEL

  if (!apiKey || !effectiveModel) {
    throw createProviderError({
      provider: 'groq', model: effectiveModel || 'unknown',
      status: 500,
      error:  'AI fallback unavailable',
      detail: 'GROQ_API_KEY or GROQ_DEFAULT_MODEL is not configured',
    })
  }

  console.log(
    `[ai][${requestId}][${ts}] attempt provider=groq model=${effectiveModel} msgs=${messages.length}`
  )

  const body = {
    model:        effectiveModel,
    temperature:  0.3,
    top_p:        0.9,
    max_tokens:   500,
    messages:     [{ role: 'system', content: systemPrompt }, ...messages],
  }

  const { ok, status, data } = await postJson(
    'https://api.groq.com/openai/v1/chat/completions',
    { headers: { Authorization: `Bearer ${apiKey}` }, body }
  )

  if (!ok) {
    const detail = getUpstreamMessage(data)
    throw createProviderError({
      provider: 'groq', model: effectiveModel,
      status,
      error:  statusToClientError(status),
      detail,
    })
  }

  const text = data?.choices?.[0]?.message?.content || ''
  console.log(
    `[ai][${requestId}][${ts}] success provider=groq model=${effectiveModel} len=${text.length}`
  )

  return { text, provider: 'groq', model: effectiveModel }
}

// ---------------------------------------------------------------------------
// HTTP status selector
// ---------------------------------------------------------------------------

function chooseHttpStatus(failures) {
  const statuses = failures.map((f) => f.status).filter(Boolean)
  if (statuses.some((s) => s === 401 || s === 403)) return 401
  if (statuses.includes(429))                         return 429
  if (statuses.includes(400))                         return 400
  if (statuses.length > 0 && statuses.every((s) => s >= 500 && s < 600)) return 502
  return statuses[0] || 502
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const requestId = globalThis.crypto?.randomUUID?.() || String(Date.now())
  const ts        = new Date().toISOString()

  try {
    await requireUser(req)

    const body     = req.body || {}
    const messages = Array.isArray(body.messages) ? body.messages : []
    const mode     = body.mode  || 'chat'
    const model    = body.model // optional client override

    const systemPrompt = buildTetoSystem(mode, messages)

    // -----------------------------------------------------------------------
    // Build OpenRouter candidate list (deduplicated)
    // -----------------------------------------------------------------------
    const NEMOTRON3_MODEL     = 'nvidia/nemotron-3-super-120b-a12b:free'
    const defaultModel  = model || process.env.OPENROUTER_DEFAULT_MODEL || ''

    const candidates = [NEMOTRON3_MODEL]
    if (defaultModel && defaultModel !== NEMOTRON3_MODEL) {
      candidates.push(defaultModel)
    }

    // -----------------------------------------------------------------------
    // 1. Try OpenRouter cascade
    // -----------------------------------------------------------------------
    try {
      const result = await callOpenRouterWithFallback({
        models: candidates,
        messages,
        systemPrompt,
        requestId,
        ts,
      })
      return res.status(200).json({ text: result.text, provider: result.provider, requestId })
    } catch (orErr) {
      console.error(
        `[ai][${requestId}][${ts}] all OpenRouter models failed; trying Groq fallback`
      )

      // -----------------------------------------------------------------------
      // 2. Groq fallback
      // -----------------------------------------------------------------------
      try {
        const fallback = await callGroq({ messages, systemPrompt, requestId, ts })
        return res.status(200).json({
          text:         fallback.text,
          provider:     fallback.provider,
          fallbackFrom: 'openrouter',
          requestId,
        })
      } catch (groqError) {
        console.error(
          `[ai][${requestId}][${ts}] provider=groq failed status=${groqError.status || 'unknown'}`,
          groqError.detail || groqError.message
        )

        // Collect all failures for the error response
        const orFailures  = orErr.failures || []
        const allFailures = [
          ...orFailures,
          {
            provider: groqError.provider || 'groq',
            model:    groqError.model    || 'unknown',
            status:   groqError.status   || null,
            error:    groqError.message  || 'Provider failed',
            detail:   groqError.detail   || null,
          },
        ]

        const status = chooseHttpStatus(allFailures)
        return res.status(status).json({
          error:          statusToClientError(status),
          detail:         'All configured AI providers failed',
          upstreamStatus: allFailures[0]?.status || null,
          requestId,
          failures:       allFailures,
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