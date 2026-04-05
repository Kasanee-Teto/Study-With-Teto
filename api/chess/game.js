import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireUser } from '../_lib/requireUser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireUser(req)
    const admin = supabaseAdmin()

    const { data: appUser, error: appUserErr } = await admin
      .from('app_users')
      .select('id')
      .eq('supabase_user_id', user.id)
      .single()

    if (appUserErr || !appUser) {
      return res.status(400).json({ error: 'User profile not found; call /api/user/upsert first' })
    }

    const { pgn, result } = req.body || {}
    if (!pgn) return res.status(400).json({ error: 'Missing pgn' })

    const { data, error } = await admin
      .from('chess_games')
      .insert({ user_id: appUser.id, pgn, result: result || null })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ game: data })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}