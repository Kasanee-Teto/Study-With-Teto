import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireUser } from '../_lib/requireUser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireUser(req)
    const admin = supabaseAdmin()

    const githubLogin =
      user?.user_metadata?.user_name ||
      user?.user_metadata?.preferred_username ||
      null

    const email = user.email || null

    const { data, error } = await admin
      .from('app_users')
      .upsert(
        {
          supabase_user_id: user.id,
          github_login: githubLogin,
          ...(email && { email }),
          display_name: user?.user_metadata?.full_name || githubLogin || email
        },
        { onConflict: 'supabase_user_id' }
      )
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ appUser: data })
  } catch (e) {
    if (e.message === 'Missing Authorization Bearer token' || e.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}