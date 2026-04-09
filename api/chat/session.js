import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireUser } from '../_lib/requireUser.js'

const DEFAULT_SESSION_TITLE = 'New chat'

export default async function handler(req, res) {
  try {
    const user = await requireUser(req)
    const admin = supabaseAdmin()

    const { data: appUser, error: appUserErr } = await admin
      .from('app_users')
      .select('id')
      .eq('supabase_user_id', user.id)
      .single()

    if (appUserErr) {
      // PGRST116 = "no rows" returned by PostgREST — user profile missing
      if (appUserErr.code === 'PGRST116') {
        return res.status(400).json({ error: 'User profile not found; call /api/user/upsert first' })
      }
      return res.status(500).json({ error: 'Database error' })
    }

    if (req.method === 'GET') {
      const rawLimit = parseInt(req.query?.limit, 10)
      const limit = Math.min(Number.isNaN(rawLimit) ? 50 : Math.max(rawLimit, 1), 100)
      const { data, error } = await admin
        .from('chat_sessions')
        .select('id, title, created_at')
        .eq('user_id', appUser.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ sessions: data || [] })
    }

    if (req.method === 'POST') {
      const { title } = req.body || {}
      const { data, error } = await admin
        .from('chat_sessions')
        .insert({ user_id: appUser.id, title: title || DEFAULT_SESSION_TITLE })
        .select('id, title, created_at')
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ session: data })
    }

    if (req.method === 'PATCH') {
      const { sessionId, title } = req.body || {}
      if (!sessionId || typeof title !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId/title' })
      }

      const { data, error } = await admin
        .from('chat_sessions')
        .update({ title: title.trim() || DEFAULT_SESSION_TITLE })
        .eq('id', sessionId)
        .eq('user_id', appUser.id)
        .select('id, title, created_at')
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ session: data })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}
