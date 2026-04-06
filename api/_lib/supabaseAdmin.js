import { createClient } from '@supabase/supabase-js'

// Singleton: reuse client across invocations in the same process
let _client = null

export function supabaseAdmin() {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Missing server env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    }
    _client = createClient(url, key, {
      auth: { persistSession: false }
    })
  }
  return _client
}