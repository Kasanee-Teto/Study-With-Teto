import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireUser } from '../_lib/requireUser.js'

export default async function handler(req, res) {
  try {
    const user = await requireUser(req)
    const admin = supabaseAdmin()
    const sessionId = req.method === 'GET' ? req.query?.sessionId : req.body?.sessionId
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

    // Map auth user to app_users.id using stable supabase_user_id
    const { data: appUser, error: appUserErr } = await admin
      .from('app_users')
      .select('id')
      .eq('supabase_user_id', user.id)
      .single()

    if (appUserErr) {
      // PGRST116 = "no rows" — user profile not found
      if (appUserErr.code === 'PGRST116') {
        return res.status(403).json({ error: 'User profile not found; call /api/user/upsert first' })
      }
      return res.status(500).json({ error: 'Database error' })
    }

    // Verify session belongs to this user (no existence leak — same 403 either way)
    const { data: session, error: sessionErr } = await admin
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', appUser.id)
      .single()

    if (sessionErr || !session) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (req.method === 'GET') {
      const limit = Math.min(Number(req.query?.limit) || 200, 500)
      const { data, error } = await admin
        .from('chat_messages')
        .select('id, session_id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ messages: data || [] })
    }

    if (req.method === 'POST') {
      const { role, content } = req.body || {}
      if (!role || !content) return res.status(400).json({ error: 'Missing role/content' })
      if (!['user', 'assistant'].includes(role)) return res.status(400).json({ error: 'Invalid role' })

      const { data, error } = await admin
        .from('chat_messages')
        .insert({ session_id: sessionId, role, content })
        .select('id, session_id, role, content, created_at')
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ message: data })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}
