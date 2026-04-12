import { supabaseAdmin } from './supabaseAdmin.js'

export async function requireUser(req) {
  const auth = req.headers.authorization || ''
  const m = auth.match(/^Bearer (.+)$/)
  if (!m) throw new Error('Missing Authorization Bearer token')

  const token = m[1]
  const admin = supabaseAdmin()

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) throw new Error('Invalid token')

  return data.user
}