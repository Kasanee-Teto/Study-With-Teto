import { createClient } from '@supabase/supabase-js'

// Singleton: reuse client across invocations in the same process
let _client = null

export function supabaseAdmin() {
  if (!_client) {
    _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  }
  return _client
}