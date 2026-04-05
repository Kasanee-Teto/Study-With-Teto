import { supabaseAdmin } from '../_lib/supabaseAdmin'
import { requireUser } from '../_lib/requireUser'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await requireUser(req) // just validate token; session ownership checks can be added later
    const admin = supabaseAdmin()

    const { sessionId, role, content } = req.body || {}
    if (!sessionId || !role || !content) return res.status(400).json({ error: 'Missing sessionId/role/content' })

    const { data, error } = await admin
      .from('chat_messages')
      .insert({ session_id: sessionId, role, content })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ message: data })
  } catch (e) {
    return res.status(401).json({ error: String(e.message || e) })
  }
}