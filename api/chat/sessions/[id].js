import { createClient } from '@supabase/supabase-js'

const MAX_TITLE = 120

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url) throw new Error('SUPABASE_URL is required')
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY is required')

  return { url, anonKey }
}

function normalizeTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function getBearerToken(req) {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice('Bearer '.length).trim()
}

function createUserScopedSupabase(accessToken) {
  const { url, anonKey } = getSupabaseEnv()
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = globalThis.crypto?.randomUUID?.() || String(Date.now())

  try {
    const sessionId = req.query.id
    const title = normalizeTitle(req.body?.title)
    const accessToken = getBearerToken(req)

    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized', requestId })
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session id', requestId })
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required', requestId })
    }

    if (title.length > MAX_TITLE) {
      return res.status(400).json({ error: `Title too long (max ${MAX_TITLE})`, requestId })
    }

    const supabase = createUserScopedSupabase(accessToken)

    // Validate token and get auth user
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Unauthorized', requestId })
    }

    // RLS-safe update:
    // We only set title. updated_at should be handled by DB trigger.
    // RLS policy on chat_sessions ensures user can only update owned sessions.
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId)
      .select('id, user_id, title, created_at, updated_at')
      .single()

    if (error) {
      // No row visible/updatable under RLS => not found for this user (or not existing)
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found', requestId })
      }
      return res.status(500).json({ error: error.message, requestId })
    }

    return res.status(200).json(data)
  } catch (e) {
    console.error(`[sessions.patch][${requestId}]`, e)
    return res.status(500).json({
      error: 'Server error',
      requestId,
      detail: String(e?.message || e)
    })
  }
}