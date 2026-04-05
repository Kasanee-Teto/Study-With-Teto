import { supabase } from '../lib/supabaseClient'

export default function Login() {
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Study with Teto</h1>
      <p>Login required.</p>
      <button onClick={signIn}>Login with GitHub</button>
    </div>
  )
}