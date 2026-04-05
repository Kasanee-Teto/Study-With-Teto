import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>
      <div>Logged in as: {user?.user_metadata?.user_name || user?.email}</div>

      <ul>
        <li><Link to="/chat">Chat with Teto</Link></li>
        <li><Link to="/chess">Play Chess vs Teto</Link></li>
      </ul>

      <button onClick={logout}>Logout</button>
    </div>
  )
}