import { createClient } from '@supabase/supabase-js'

const DEV_MOCK_AUTH = import.meta.env.VITE_DEV_MOCK_AUTH === 'true'

const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.local',
  user_metadata: {
    user_name: 'Dev User',
    full_name: 'Dev User'
  }
}

const mockSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  user: mockUser
}

function createMockSupabase() {
  return {
    auth: {
      async getSession() {
        return {
          data: { session: mockSession },
          error: null
        }
      },

      async getUser() {
        return {
          data: { user: mockUser },
          error: null
        }
      },

      onAuthStateChange(callback) {
        setTimeout(() => callback('SIGNED_IN', mockSession), 0)

        return {
          data: {
            subscription: {
              unsubscribe() {}
            }
          }
        }
      },

      async signInWithPassword() {
        return {
          data: {
            user: mockUser,
            session: mockSession
          },
          error: null
        }
      },

      async signUp() {
        return {
          data: {
            user: mockUser,
            session: mockSession
          },
          error: null
        }
      },

      async signInWithOAuth() {
        window.location.href = `${window.location.origin}/dashboard`

        return {
          data: {},
          error: null
        }
      },

      async signOut() {
        return { error: null }
      }
    },

    from(table) {
      return {
        insert(rows) {
          console.info(`[mock-supabase] insert into ${table}`, rows)

          return Promise.resolve({
            data: rows,
            error: null
          })
        }
      }
    }
  }
}

let supabase

if (DEV_MOCK_AUTH) {
  console.warn('[dev] Using mock Supabase auth. No real auth/database calls will be made.')
  supabase = createMockSupabase()
} else {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.'
    )
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
