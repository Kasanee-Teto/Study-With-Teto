import { supabase } from './supabaseClient.js'

const base = import.meta.env.VITE_API_BASE_URL || ''

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
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error || 'Request failed')
  return data
}

export async function callAI({ mode, messages, model }) {
  // AI endpoint can be public server-side, but keep auth anyway for rate-limit & logging
  const data = await postJSON('/api/ai', { mode, messages, model })
  return data.text
}