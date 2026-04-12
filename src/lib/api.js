import { supabase } from './supabaseClient.js'

const base = import.meta.env.VITE_API_BASE_URL || ''
const isDev = import.meta.env.DEV

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${token}` }
}

export async function postJSON(path, body) {
  const headers = await authHeaders()
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })

  let data
  try {
    data = await r.json()
  } catch {
    data = {}
  }

  if (!r.ok) {
    const requestId = data?.requestId
    const detail = data?.detail
    const upstreamStatus = data?.upstreamStatus

    // Build a descriptive message
    let message = data?.error || `HTTP ${r.status}`
    if (detail) message += ` — ${detail}`

    if (isDev) {
      const debugParts = [`[${r.status}] POST ${path}`]
      if (requestId) debugParts.push(`requestId=${requestId}`)
      if (upstreamStatus) debugParts.push(`upstreamStatus=${upstreamStatus}`)
      console.warn('[postJSON debug]', ...debugParts)
    }

    const err = new Error(message)
    err.status = r.status
    err.requestId = requestId
    err.upstreamStatus = upstreamStatus
    err.detail = detail
    throw err
  }

  return data
}

export async function getJSON(path, params = {}) {
  const headers = await authHeaders()
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  ).toString()
  const url = query ? `${base}${path}?${query}` : `${base}${path}`
  const r = await fetch(url, { headers })

  let data
  try {
    data = await r.json()
  } catch {
    data = {}
  }

  if (!r.ok) {
    const err = new Error(data?.error || `HTTP ${r.status}`)
    err.status = r.status
    err.detail = data?.detail
    throw err
  }

  return data
}

export async function patchJSON(path, body) {
  const headers = await authHeaders()
  const r = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })

  let data
  try {
    data = await r.json()
  } catch {
    data = {}
  }

  if (!r.ok) {
    const err = new Error(data?.error || `HTTP ${r.status}`)
    err.status = r.status
    err.detail = data?.detail
    throw err
  }

  return data
}

export async function callAI({ mode, messages, model }) {
  // AI endpoint can be public server-side, but keep auth anyway for rate-limit & logging
  const data = await postJSON('/api/ai', { mode, messages, model })
  return data.text
}
