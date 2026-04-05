import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireUser } from '../_lib/requireUser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireUser(req)
    const admin = supabaseAdmin()

    const { sessionId, role, content } = req.body || {}
    if (!sessionId || !role || !content) return res.status(400).json({ error: 'Missing sessionId/role/content' })

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

    const { data, error } = await admin
      .from('chat_messages')
      .insert({ session_id: sessionId, role, content })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ message: data })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}